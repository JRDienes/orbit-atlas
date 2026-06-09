import * as THREE from "three";
import { MOTION, prefersReducedMotion } from "./motionConfig";

// ── Ambient living layers ───────────────────────────────────────────────
// Always-running, deliberately subtle texture: a radar sweep ring, the
// atmosphere limb breathing, and one satellite at a time wearing a soft
// pulsing glow ring. Three layers max (the terminator was cut on purpose to
// honor that cap). Their periods are deliberately offset/co-prime-ish —
// 6s / 7.3s / 8.6s — so peaks drift apart and never stack into an "event".
//
// All objects are created once and reused forever: no per-cycle allocation,
// no create/destroy. Everything updates inside the existing render loop.
//
// Usage:
//   const ambient = createAmbientFX({ scene, earth, camera, atmosMat, getSats });
//   ...in render loop: ambient.update(performance.now());
//   ...on teardown:    ambient.dispose();
export function createAmbientFX({ scene, earth, camera, atmosMat, getSats }) {
  // OS-level reduced-motion preference: skip all ambient animation
  if (prefersReducedMotion()) {
    return { update: () => {}, dispose: () => {} };
  }
  const cfg = MOTION.ambient;
  const disposables = [];

  // ── Layer 1: radar sweep ring ─────────────────────────────────────────
  // A camera-facing ring born at the limb every ~6s, expanding and fading
  // like a passive sensor pulse. Quiet by design (peaks at 0.16 opacity).
  let sweepMesh = null;
  if (cfg.radarSweep.enabled) {
    const geo = new THREE.RingGeometry(0.985, 1.0, 96);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    sweepMesh = new THREE.Mesh(geo, mat);
    sweepMesh.renderOrder = 2;
    sweepMesh.frustumCulled = false;
    scene.add(sweepMesh);
    disposables.push(geo, mat);
  }

  // ── Layer 3: single-satellite glow ring ───────────────────────────────
  // ONE satellite at a time gets a soft pulsing ring for a few seconds,
  // then the spotlight moves on. Parented to the earth mesh so it tracks
  // rotation. Reused — never recreated per cycle.
  let glowMesh = null;
  let glowSatIdx = -1;
  let glowCycleStart = 0;
  if (cfg.satGlowCycle.enabled) {
    const geo = new THREE.RingGeometry(0.9, 1.0, 48);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    glowMesh = new THREE.Mesh(geo, mat);
    glowMesh.renderOrder = 2;
    glowMesh.frustumCulled = false;
    glowMesh.visible = false;
    scene.add(glowMesh);
    disposables.push(geo, mat);
  }

  const worldVec = new THREE.Vector3();

  function update(now) {
    // Radar sweep — phase 0..1 over the period, ease-out fade as it expands
    if (sweepMesh) {
      const t = (now % cfg.radarSweep.periodMs) / cfg.radarSweep.periodMs;
      const scale = 1.05 + t * (cfg.radarSweep.maxScale - 1.05);
      sweepMesh.scale.setScalar(scale);
      sweepMesh.material.opacity = (1 - t) * (1 - t) * cfg.radarSweep.baseOpacity;
      sweepMesh.lookAt(camera.position);
    }

    // Atmosphere breathing — slow sine on the limb glow's base opacity.
    // Offset by half a sweep period so the two never peak together.
    if (cfg.atmosphereBreath.enabled && atmosMat) {
      const phase = ((now + cfg.radarSweep.periodMs / 2) % cfg.atmosphereBreath.periodMs) / cfg.atmosphereBreath.periodMs;
      atmosMat.opacity = 0.05 * (1 + Math.sin(phase * Math.PI * 2) * cfg.atmosphereBreath.amplitude);
    }

    // Satellite glow cycle — dwell on one sat, pulse softly, move on.
    if (glowMesh) {
      const sats = getSats();
      if (sats && sats.length > 0) {
        const elapsed = now - glowCycleStart;
        if (glowSatIdx < 0 || elapsed > cfg.satGlowCycle.dwellMs || sats[glowSatIdx]?.timelineHidden) {
          // Pick the next visible sat pseudo-randomly; bail quietly if unlucky.
          for (let tries = 0; tries < 8; tries++) {
            const idx = (Math.random() * sats.length) | 0;
            if (!sats[idx].timelineHidden) { glowSatIdx = idx; break; }
          }
          glowCycleStart = now;
        }
        const s = sats[glowSatIdx];
        if (s && !s.timelineHidden) {
          worldVec.set(s.x, s.y, s.z).applyMatrix4(earth.matrixWorld);
          glowMesh.position.copy(worldVec);
          glowMesh.lookAt(camera.position);
          const p = ((now - glowCycleStart) % cfg.satGlowCycle.pulseMs) / cfg.satGlowCycle.pulseMs;
          const zoomScale = Math.max(1, camera.position.z / 2);
          glowMesh.scale.setScalar((0.018 + p * 0.05) * zoomScale);
          // Fade in/out across the dwell so handoffs between sats are seamless
          const dwellP = (now - glowCycleStart) / cfg.satGlowCycle.dwellMs;
          const envelope = Math.min(1, Math.min(dwellP, 1 - dwellP) * 6);
          glowMesh.material.opacity = (1 - p) * 0.28 * Math.max(0, envelope);
          glowMesh.visible = true;
        } else {
          glowMesh.visible = false;
        }
      }
    }
  }

  function dispose() {
    if (sweepMesh) scene.remove(sweepMesh);
    if (glowMesh) scene.remove(glowMesh);
    disposables.forEach(d => d.dispose());
  }

  return { update, dispose };
}
