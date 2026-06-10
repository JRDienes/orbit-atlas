import * as THREE from "three";
import { MOTION, prefersReducedMotion } from "./motionConfig";

// ── Ambient auto-scan mode (the centerpiece) ────────────────────────────
// After ~4s of no input the globe starts surveying itself: slow weighted
// rotation, and every ~4s the system locks a reticle onto ONE interesting
// satellite, decodes a callout label, holds ~2s, releases, moves on.
//
// State machine: IDLE → SELECTING → LOCKING → DISPLAYING → RELEASING → loop.
// Any user input snaps it back to IDLE instantly and cleanly. The camera
// never flies — the globe rotates and annotation happens in place.
//
// Focal-tier rules respected here:
//   · exactly ONE callout at a time
//   · reticle/label/connector DOM nodes are created once and reused forever
//   · all tracking happens inside the existing render loop (no timers)
//
// Intended feel: a defense-grade system idly working — confident, unhurried,
// precise. The restraint (one target, quiet brackets, fast release) is the
// whole effect.

const DECODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&";

// Circular-orbit velocity approximation from average altitude (km) — good
// enough for HUD flavor: v = sqrt(GM / r), GM(Earth) = 398600 km³/s².
function orbitalVelocity(sat) {
  const apo = sat.apoapsis, peri = sat.periapsis ?? sat.apoapsis;
  if (apo == null) return null;
  const r = 6371 + (apo + peri) / 2;
  return Math.sqrt(398600.4 / r);
}

// Interest score for target selection — weight toward the ISS, Starlink,
// unusual orbits (retrograde / very high), and recent launches.
function interestScore(sat) {
  let score = 1;
  if (sat.norad_cat_id === 25544) score += 8; // the ISS is always interesting
  if (sat.category === "starlink") score += 2;
  if (sat.inclination != null && sat.inclination > 95) score += 3; // retrograde / sun-sync
  if (sat.apoapsis != null && sat.apoapsis > 35000) score += 2;    // GEO and beyond
  if (sat.apoapsis != null && sat.periapsis != null && sat.apoapsis - sat.periapsis > 5000) score += 3; // eccentric
  if (sat.launch_date && sat.launch_date >= String(new Date().getFullYear() - 1)) score += 4; // recent launch
  return score;
}

export function createAutoScan({ earth, wire, camera, getSats, getSelected, isMobile }) {
  // OS-level reduced-motion preference: no auto-scan, no manual reticle
  if (prefersReducedMotion()) {
    return { update: () => {}, notifyUserInput: () => {}, dispose: () => {}, isScanning: () => false };
  }
  const cfg = MOTION.autoScan;

  // ── Reused DOM overlay (created once — never per cycle) ───────────────
  const root = document.createElement("div");
  root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:850;";

  // Reticle: center ring + 4 corner brackets, CSS-animated lock-in.
  const reticle = document.createElement("div");
  reticle.className = "hud-gpu";
  reticle.style.cssText = "position:fixed;width:54px;height:54px;left:0;top:0;display:none;";
  reticle.innerHTML = `
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" stroke="#00d4ff" stroke-width="1.2" style="position:absolute;inset:0;">
      <circle cx="27" cy="27" r="8" opacity="0.9"/>
      <circle cx="27" cy="27" r="1.6" fill="#00d4ff" stroke="none"/>
    </svg>
    <svg class="hud-scan-brackets" width="54" height="54" viewBox="0 0 54 54" fill="none" stroke="#00d4ff" stroke-width="1.6" style="position:absolute;inset:0;">
      <path d="M14 4 h-10 v10 M40 4 h10 v10 M14 50 h-10 v-10 M40 50 h10 v-10"/>
    </svg>`;

  // Callout label: monospace readout inside viewfinder corner brackets
  // (corners only — no solid box).
  const label = document.createElement("div");
  label.style.cssText = [
    "position:fixed;left:0;top:0;display:none;padding:8px 12px;min-width:170px;",
    "font-family:'Courier New',monospace;color:#cde;font-size:10px;letter-spacing:1px;line-height:1.65;",
    "background:rgba(2,8,24,0.55);backdrop-filter:blur(4px);",
  ].join("");
  const corners = document.createElement("div");
  corners.style.cssText = "position:absolute;inset:0;pointer-events:none;";
  corners.innerHTML = `
    <span style="position:absolute;left:0;top:0;width:9px;height:9px;border-left:1px solid #00d4ff;border-top:1px solid #00d4ff;"></span>
    <span style="position:absolute;right:0;top:0;width:9px;height:9px;border-right:1px solid #00d4ff;border-top:1px solid #00d4ff;"></span>
    <span style="position:absolute;left:0;bottom:0;width:9px;height:9px;border-left:1px solid #00d4ff;border-bottom:1px solid #00d4ff;"></span>
    <span style="position:absolute;right:0;bottom:0;width:9px;height:9px;border-right:1px solid #00d4ff;border-bottom:1px solid #00d4ff;"></span>`;
  const labelText = document.createElement("div");
  label.appendChild(corners);
  label.appendChild(labelText);

  // Connector: one SVG line from reticle edge to label corner.
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = "position:fixed;inset:0;width:100%;height:100%;display:none;";
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("stroke", "#00d4ff");
  line.setAttribute("stroke-width", "1");
  line.setAttribute("opacity", "0.55");
  svg.appendChild(line);

  root.appendChild(svg);
  root.appendChild(reticle);
  root.appendChild(label);
  document.body.appendChild(root);

  // ── State ──────────────────────────────────────────────────────────────
  let state = "IDLE";
  let lastInput = performance.now();
  let stateStart = 0;
  let target = null;       // current satellite
  let targetLines = [];    // decoded label lines
  let decodeStart = 0;
  let connectorProgress = 0;
  const projVec = new THREE.Vector3();

  function setState(next, now) { state = next; stateStart = now; }

  function notifyUserInput() {
    lastInput = performance.now();
    if (state !== "IDLE") stopCleanly();
  }

  function stopCleanly() {
    state = "IDLE";
    target = null;
    reticle.style.display = "none";
    label.style.display = "none";
    svg.style.display = "none";
    reticle.style.opacity = "1";
    label.style.opacity = "1";
  }

  // Project a sat (earth-local coords) to screen space; null if it's on the
  // far side of the globe or outside the comfortable viewport band.
  function project(sat, marginX = 0.72, marginY = 0.62) {
    projVec.set(sat.x, sat.y, sat.z).applyMatrix4(earth.matrixWorld);
    // Far-side check: the globe (radius ~1) occludes points whose world
    // position is "behind" the sphere relative to the camera.
    const toCam = camera.position.clone().sub(projVec);
    if (projVec.dot(toCam.normalize()) < 0.1) return null;
    projVec.project(camera);
    if (projVec.z > 1) return null;
    if (Math.abs(projVec.x) > marginX || Math.abs(projVec.y) > marginY) return null;
    return {
      x: (projVec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projVec.y * 0.5 + 0.5) * window.innerHeight,
      ndcX: projVec.x,
    };
  }

  // Weighted pick from a random candidate sample, restricted to sats that
  // are actually on the visible face right now.
  function pickTarget(sats) {
    let best = null, bestScore = -1;
    for (let tries = 0; tries < 60; tries++) {
      const s = sats[(Math.random() * sats.length) | 0];
      if (!s || s.timelineHidden || s.apoapsis == null) continue;
      if (!project(s)) continue;
      const score = interestScore(s) * (0.6 + Math.random() * 0.8); // jitter so it doesn't fixate
      if (score > bestScore) { bestScore = score; best = s; }
    }
    return best;
  }

  function buildLabelLines(sat) {
    const v = orbitalVelocity(sat);
    return [
      sat.object_name || "UNKNOWN OBJECT",
      `NORAD ${sat.norad_cat_id}`,
      `ALT ${sat.apoapsis != null ? Math.round(sat.apoapsis).toLocaleString() + " KM" : "—"}`,
      `VEL ${v ? v.toFixed(2) + " KM/S" : "—"}`,
      `ORG ${sat.country_code || "—"}`,
    ];
  }

  // Per-frame decode render: characters scramble, locking left→right.
  function renderDecode(now) {
    const p = Math.min(1, (now - decodeStart) / cfg.decodeMs);
    const html = targetLines.map((text, li) => {
      const lock = Math.floor(p * text.length);
      let out = text.slice(0, lock);
      if (p < 1) {
        for (let i = lock; i < text.length; i++) {
          out += text[i] === " " ? " " : DECODE_CHARS[(Math.random() * DECODE_CHARS.length) | 0];
        }
      }
      const color = li === 0 ? "#fff" : "#9bc";
      const weight = li === 0 ? "bold" : "normal";
      return `<div style="color:${color};font-weight:${weight};">${out}</div>`;
    }).join("");
    labelText.innerHTML = html;
    return p >= 1;
  }

  // Place reticle + label + connector at the target's current screen pos.
  function track() {
    if (!target) return false;
    const pos = project(target, 0.95, 0.92); // wider margins while tracking
    if (!pos) return false;
    reticle.style.transform = `translate(${pos.x - 27}px, ${pos.y - 27}px)`;
    // Label sits to the side away from the screen edge
    const flip = pos.ndcX > 0.15;
    const lx = flip ? pos.x - 64 - label.offsetWidth : pos.x + 64;
    const ly = pos.y - 30;
    label.style.transform = `translate(${lx}px, ${ly}px)`;
    // Connector from reticle edge toward the label, drawing in over ~120ms
    const x1 = pos.x + (flip ? -29 : 29), y1 = pos.y;
    const x2 = flip ? lx + label.offsetWidth : lx, y2 = ly + 16;
    const fx = x1 + (x2 - x1) * connectorProgress, fy = y1 + (y2 - y1) * connectorProgress;
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", fx); line.setAttribute("y2", fy);
    return true;
  }

  // ── Manual focus: the clicked satellite borrows the scan reticle ───────
  // While a satellite is selected the scan is suppressed, but the same
  // (reused) reticle locks onto the selection with the full bracket
  // animation — focal tier, brightest thing on screen.
  let manualNorad = null;
  function trackManual(sat) {
    if (sat.norad_cat_id !== manualNorad) {
      manualNorad = sat.norad_cat_id;
      reticle.style.display = "block";
      reticle.style.opacity = "1";
      reticle.style.transition = "none";
      reticle.style.animation = `hud-reticle-in ${cfg.lockMs}ms ease-out both`;
      const brackets = reticle.querySelector(".hud-scan-brackets");
      if (brackets) {
        brackets.style.animation = "none";
        void brackets.offsetWidth;
        brackets.style.animation = `hud-bracket-pulse 0.5s ease-out ${cfg.lockMs}ms 1`;
      }
    }
    const pos = project(sat, 1.05, 1.05);
    if (pos) {
      reticle.style.transform = `translate(${pos.x - 27}px, ${pos.y - 27}px)`;
      reticle.style.visibility = "visible";
    } else {
      reticle.style.visibility = "hidden"; // rotated behind the globe
    }
  }
  function clearManual() {
    if (manualNorad === null) return;
    manualNorad = null;
    reticle.style.display = "none";
    reticle.style.visibility = "visible";
  }

  function update(now) {
    const sel = getSelected();
    if (!cfg.enabled || isMobile() || sel) {
      if (state !== "IDLE") stopCleanly();
      if (sel && !isMobile()) trackManual(sel);
      else clearManual();
      return;
    }
    clearManual();

    if (state === "IDLE") {
      if (now - lastInput > cfg.idleMs) setState("SELECTING", now);
      return;
    }

    // Scanning: slow weighted auto-rotation, annotate in place — never fly.
    earth.rotation.y += cfg.rotationSpeed;
    if (wire) wire.rotation.y = earth.rotation.y;

    if (state === "SELECTING") {
      // Small breather between cycles keeps the rhythm unhurried
      if (now - stateStart < Math.max(0, cfg.cycleMs - cfg.lockMs - cfg.decodeMs - cfg.displayMs - cfg.releaseMs)) return;
      const sats = getSats();
      if (!sats || sats.length === 0) return;
      const next = pickTarget(sats);
      if (!next) return; // try again next frame
      target = next;
      targetLines = buildLabelLines(next);
      decodeStart = now + cfg.lockMs;
      connectorProgress = 0;
      // Reticle lock-in: 150ms scale-in + one bracket pulse
      reticle.style.display = "block";
      reticle.style.opacity = "1";
      reticle.style.animation = `hud-reticle-in ${cfg.lockMs}ms ease-out both`;
      const brackets = reticle.querySelector(".hud-scan-brackets");
      if (brackets) {
        brackets.style.animation = "none";
        void brackets.offsetWidth; // restart the one-shot pulse
        brackets.style.animation = `hud-bracket-pulse 0.5s ease-out ${cfg.lockMs}ms 1`;
      }
      label.style.display = "block";
      label.style.opacity = "1";
      svg.style.display = "block";
      labelText.innerHTML = "";
      setState("LOCKING", now);
      return;
    }

    if (!track()) {
      // Target rotated out of view — release immediately, pick fresh
      setState("SELECTING", now);
      reticle.style.display = "none";
      label.style.display = "none";
      svg.style.display = "none";
      target = null;
      return;
    }

    if (state === "LOCKING") {
      connectorProgress = Math.min(1, (now - stateStart) / (cfg.lockMs + 120));
      if (now >= decodeStart) {
        const done = renderDecode(now);
        if (done) setState("DISPLAYING", now);
      }
      return;
    }

    if (state === "DISPLAYING") {
      if (now - stateStart > cfg.displayMs) {
        setState("RELEASING", now);
        reticle.style.animation = "none";
        reticle.style.transition = `opacity ${cfg.releaseMs}ms ease-out`;
        label.style.transition = `opacity ${cfg.releaseMs}ms ease-out`;
        reticle.style.opacity = "0";
        label.style.opacity = "0";
        svg.style.display = "none";
      }
      return;
    }

    if (state === "RELEASING") {
      if (now - stateStart > cfg.releaseMs) {
        target = null;
        reticle.style.display = "none";
        label.style.display = "none";
        reticle.style.transition = "none";
        label.style.transition = "none";
        setState("SELECTING", now);
      }
    }
  }

  function dispose() {
    document.body.removeChild(root);
  }

  return { update, notifyUserInput, dispose, isScanning: () => state !== "IDLE" };
}
