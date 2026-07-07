import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { createClient } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { CATEGORIES, CATEGORY_CODES } from "./utils/constants";
import { COLORS as C, FONT } from "./theme";
import { altToRadius, latLonToXYZ } from "./utils/geo";
import LoadingOverlay from "./components/LoadingOverlay";
import WelcomeBanner from "./components/WelcomeBanner";
import Header from "./components/Header";
import About from "./components/About";
import GlobalKey from "./components/GlobalKey";
import ResetButton from "./components/ResetButton";
import TimelineControl from "./components/TimelineControl";
import SpeedControl from "./components/SpeedControl";
import ISSPanel from "./components/ISSPanel";
import FilterPanel from "./components/FilterPanel";
import CountryCodesPanel from "./components/CountryCodesPanel";
import SatelliteViewer from "./components/SatelliteViewer";
import MobileObjectData from "./components/MobileObjectData";
import CollapsibleSection from "./components/CollapsibleSection";
import LocalTimePanel from "./components/LocalTimePanel";
import LunarPanel from "./components/LunarPanel";
import { MOTION } from "./fx/motionConfig";
import { createAmbientFX } from "./fx/ambient";
import { createAutoScan } from "./fx/autoScan";
import { subsolarLocalDir, createRealEarthMaterial } from "./fx/realEarth";
import { LUNAR_SITES, LUNAR_ORBITERS, lunarLatLonToXYZ } from "./utils/lunarData";
import { PLANETS, TEX_BASE, planetLongitudeDeg } from "./utils/bodies";
import "./hud.css";

// Without credentials the app falls back to a synthetic demo catalog
// (utils/demoCatalog.js) instead of crashing on a blank page — useful for
// local preview when .env isn't set up.
const HAS_SUPABASE = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_KEY);
const supabase = HAS_SUPABASE
  ? createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_KEY)
  : null;

const ISS_TRAIL_LEN = 18;
const ISS_COLOR = new THREE.Color("#FFD700");

// Drill-able country/generation codes for a category (excludes Name:/Type:/
// "All other codes" sentinels). rest_of_world has no static codes.
function filterableCodes(catId) {
  return (CATEGORY_CODES[catId] || []).filter(c => !c.startsWith("Name:") && !c.startsWith("Type:") && c !== "All other codes");
}

// The satellite-viewer scrub list, derived from the active categories + the
// selected codes — mirroring the globe's per-category rule: a category shows
// ALL its codes (one "whole" entry) until you drill into specific codes, then
// it shows just those. e.g. Starlink+CIS+Middle East → [all Starlink, CIS,
// all Middle East].
function deriveFocused(active, selectedCodes) {
  const entries = [];
  for (const catId of active) {
    const catCodes = filterableCodes(catId);
    const sel = selectedCodes.filter(c => catCodes.includes(c));
    if (sel.length > 0) sel.forEach(code => entries.push({ code, catId }));
    else entries.push({ code: catId, catId, whole: true });
  }
  return entries;
}

// Layout mode is orientation-aware: any device in portrait uses the mobile
// layout (so tablets standing up match phones), and only wide landscape screens
// (tablets in landscape / desktops, >= 1000px) get the desktop layout. The
// 1000px floor keeps phones-in-landscape (<= ~932px) on mobile.
function computeIsMobile() {
  const portrait = window.innerHeight >= window.innerWidth;
  return portrait || window.innerWidth < 1000;
}

export default function App() {
  const mountRef = useRef(null);
  const [active, setActive] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedCodes = useMemo(() => deriveFocused(active, selectedCodes), [active, selectedCodes]);
  // Keep the focused index valid as the derived scrub list changes.
  useEffect(() => { setFocusedIndex(i => Math.max(0, Math.min(i, focusedCodes.length - 1))); }, [focusedCodes.length]);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null); // mirror for animation-loop reads (auto-scan gate)
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  const [pinnedSats, setPinnedSats] = useState(new Set());
  const [pinnedViewIndex, setPinnedViewIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayFading, setOverlayFading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeExiting, setWelcomeExiting] = useState(false);
  const [welcomeMinTimeDone, setWelcomeMinTimeDone] = useState(false);
  // Only show welcome on first visit per session — refreshes skip it
  const isFirstVisitRef = useRef(!sessionStorage.getItem('orbit-welcomed'));
  const [issData, setIssData] = useState(null);
  const [lastSync, setLastSync] = useState(null); // last successful data refresh (header SYNC stamp)
  const [issEnabled, setIssEnabled] = useState(true);
  const [issHover, setIssHover] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [globalKeyOpen, setGlobalKeyOpen] = useState(false);
  const satsRef = useRef([]);
  const pointsRef = useRef([]);
  const sceneRef = useRef(null);
  const earthRef = useRef(null);
  const shellsRef = useRef([]);
  const pinnedShellsRef = useRef([]);
  const isolatedOrbitRef = useRef(null);
  const pinnedSatsRef = useRef(new Set());
  const highlightRef = useRef(null);
  const issMarkerRef = useRef(null);
  const issTrailRef = useRef(null);
  const issFutureRef = useRef(null);
  const issSatrecRef = useRef(null);
  const chunkIdxRef = useRef(0);
  const fullPosUpdateRef = useRef(false); // request a full position-buffer upload (filters changed)
  const cameraRef = useRef(null);
  const flyToISSRef = useRef(null);
  const issHaloRef = useRef(null);
  const issHaloVec = useRef(new THREE.Vector3());
  const activeWorkerRef = useRef(null);
  const introTimeoutsRef = useRef([]);
  const lastFrameTimeRef = useRef(null);
  const timeScaleRef = useRef(60);
  const [timeScale, setTimeScale] = useState(60);
  const [timelineYear, setTimelineYear] = useState(null);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const timelineYearRef = useRef(null);
  const timelineIntervalRef = useRef(null);
  const CURRENT_YEAR = new Date().getFullYear();
  const tooltipRef = useRef(null); // cursor-following hover tooltip (imperative DOM)
  const travelGlowRef = useRef(null); // traveling glow along the selected orbit
  // Realistic-view toggle: swaps the tactical dark/cyan globe for a natural
  // blue-marble Earth (texture + lighting only — HUD and dots are untouched)
  const [realView, setRealView] = useState(false);
  const viewRefsRef = useRef(null); // scene objects the view toggle restyles
  // Simulated clock driving the sun: advances at the same timeScale as the
  // satellites (60× default → the terminator laps the Earth in 24 real
  // minutes). SYNC resets it to actual now. simTime state surfaces the drift
  // in the header (updated 1/s — the render loop only touches the ref).
  const sunTimeRef = useRef(Date.now());
  const [simTime, setSimTime] = useState(null);
  useEffect(() => {
    const id = setInterval(() => {
      const drift = Math.abs(sunTimeRef.current - Date.now());
      setSimTime(drift > 120000 ? sunTimeRef.current : null); // show after 2 sim-drift minutes
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const syncSimTime = () => { sunTimeRef.current = Date.now(); setSimTime(null); };

  // ── Scope tabs: EARTH | MOON (NASA-Eyes-style body switch) ────────────
  // Selecting MOON swaps the centered globe: Earth (and every child — sats,
  // ISS, orbit rings) hides, and a detailed Moon takes its place at the same
  // framing, with landing-site markers and lunar orbiters. Drag/zoom/fly-to
  // all operate on whichever body is active.
  const [scope, setScope] = useState("earth");
  const scopeRef = useRef("earth");
  const zoomBoundsRef = useRef({ min: 1.5, max: 9 }); // per-scope wheel/pinch limits
  const scopeZTargetRef = useRef(null);               // camera glide target on switch
  useEffect(() => {
    scopeRef.current = scope;
    const v = viewRefsRef.current;
    if (!v) return;
    const onEarth = scope === "earth";
    const onMoon = scope === "moon";
    const onSolar = scope === "solar";
    const planet = !onEarth && !onMoon && !onSolar ? PLANETS.find(p => p.id === scope) : null;
    if (!onEarth) setSelected(null); // drop any satellite lock when leaving Earth
    if (v.earth) v.earth.visible = onEarth;      // hides all Earth children too
    if (v.wire) v.wire.visible = onEarth && !realViewRef.current;
    if (v.atmos) v.atmos.visible = onEarth;      // only Earth gets the limb glow
    if (v.moonGlobe) v.moonGlobe.visible = onMoon;
    if (v.solarGroup) v.solarGroup.visible = onSolar;
    if (v.genericGlobe) v.genericGlobe.visible = !!planet;
    // Stars feel right everywhere except the tactical Earth HUD
    if (v.stars) v.stars.visible = realViewRef.current || !onEarth;
    if (v.dragTargetRef) v.dragTargetRef.current = onMoon ? v.moonGlobe : onSolar ? v.solarGroup : planet ? v.genericGlobe : v.earth;
    zoomBoundsRef.current = onSolar ? { min: 6, max: 60 } : { min: 1.5, max: 9 };
    scopeZTargetRef.current = onSolar ? 34 : 7;
    // Individual planet view: flat color immediately, texture when cached/loaded
    if (planet && v.genericGlobe) {
      const mat = v.genericGlobe.material;
      const cached = v.planetTexCache[planet.id];
      mat.map = cached || null;
      mat.color.set(cached ? 0xffffff : planet.color);
      mat.needsUpdate = true;
      if (!cached && planet.tex) {
        new THREE.TextureLoader().load(TEX_BASE + planet.tex, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          viewRefsRef.current.planetTexCache[planet.id] = tex;
          if (scopeRef.current === planet.id) { mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; }
        }, undefined, () => {});
      }
    }
    // Lazy-load the lunar surface texture on first visit
    if (onMoon && v.moonGlobe && !v.moonTexTried) {
      v.moonTexTried = true;
      new THREE.TextureLoader().load(
        "/moon.jpg", // drop a hi-res map into public/ to override
        (tex) => { tex.colorSpace = THREE.SRGBColorSpace; v.moonGlobe.material.map = tex; v.moonGlobe.material.color.set(0xffffff); v.moonGlobe.material.needsUpdate = true; },
        undefined,
        () => new THREE.TextureLoader().load(
          "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/moon_1024.jpg",
          (tex) => { tex.colorSpace = THREE.SRGBColorSpace; v.moonGlobe.material.map = tex; v.moonGlobe.material.color.set(0xffffff); v.moonGlobe.material.needsUpdate = true; },
          undefined,
          () => console.warn("[orbit-atlas] moon texture unavailable — using plain sphere")
        )
      );
    }
  }, [scope]);
  const [isMobile, setIsMobile] = useState(computeIsMobile);
  const [wideHeader, setWideHeader] = useState(() => window.innerWidth > 600);
  const [mobileTab, setMobileTab] = useState(null);
  const mobileTabRef = useRef(null);
  const isMobileRef = useRef(computeIsMobile());

  // Fade out loading overlay, then show welcome on first visit only
  useEffect(() => {
    if (!loading) {
      setOverlayFading(true);
      const t1 = setTimeout(() => setShowOverlay(false), 900);
      // Start welcome at 600ms so it fades in as the overlay finishes clearing
      const t2 = setTimeout(() => {
        if (isFirstVisitRef.current) setShowWelcome(true);
      }, 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [loading]);

  // Mark session as seen, trigger fade-in, and enforce a minimum 2.5s display time
  useEffect(() => {
    if (!showWelcome) return;
    sessionStorage.setItem('orbit-welcomed', '1');
    const t1 = setTimeout(() => setWelcomeVisible(true), 20);
    const t2 = setTimeout(() => setWelcomeMinTimeDone(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showWelcome]);

  // Exit only when BOTH min time has elapsed AND satellites have loaded
  useEffect(() => {
    if (showWelcome && welcomeMinTimeDone && visibleCount > 0) {
      setWelcomeExiting(true);
      const t = setTimeout(() => setShowWelcome(false), 800);
      return () => clearTimeout(t);
    }
  }, [welcomeMinTimeDone, visibleCount, showWelcome]);

  // Track layout mode — re-evaluate on resize and on device rotation.
  useEffect(() => {
    const onResize = () => {
      const mobile = computeIsMobile();
      setIsMobile(mobile);
      isMobileRef.current = mobile;
      setWideHeader(window.innerWidth > 600);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Keep mobileTabRef in sync so touch handlers can read current value
  useEffect(() => { mobileTabRef.current = mobileTab; }, [mobileTab]);

  // ── Reactive: hover-pulse a satellite group on the globe ──────────────
  // Hovering a filter row or code chip lerps that group's dot colors toward
  // white for ~1s, then restores — a quick "these are mine" flash, never a
  // permanent state. Writes the color buffer directly (no React re-render).
  const pulseTimeoutRef = useRef(null);
  const pulsedRef = useRef(null); // remembers what's lit so it can be restored
  function setCategoryPulse(catId, code) {
    if (!MOTION.reactive.enabled) return;
    const { geo, satObjects } = pointsRef.current;
    if (!geo || !satObjects) return;
    const colors = geo.getAttribute("color");
    const catRGBLocal = Object.fromEntries(CATEGORIES.map(cat => {
      const cc = new THREE.Color(cat.color);
      return [cat.id, [cc.r, cc.g, cc.b]];
    }));
    // Base color must match what the recolor pass wrote (REAL view desaturates)
    const baseRGB = (s) => {
      let [r, g, b] = catRGBLocal[s.category] || [1, 1, 1];
      if (realViewRef.current) { r += (1 - r) * 0.8; g += (1 - g) * 0.8; b += (1 - b) * 0.8; }
      return [r, g, b];
    };
    const restore = () => {
      const prev = pulsedRef.current;
      if (!prev) return;
      pulsedRef.current = null;
      for (const i of prev.indices) {
        const [r, g, b] = baseRGB(satObjects[i]);
        colors.setXYZ(i, r, g, b);
      }
      colors.needsUpdate = true;
    };
    clearTimeout(pulseTimeoutRef.current);
    restore();
    if (!catId) return;
    const indices = [];
    satObjects.forEach((s, i) => {
      if (s.category !== catId) return;
      if (code && s.filterKey !== code) return;
      if (s.timelineHidden) return; // hidden dots are parked at the origin
      if (selected && s.norad_cat_id === selected.norad_cat_id) return; // keep the gold
      // Lerp toward white — clearly brighter without changing hue identity
      const [r, g, b] = baseRGB(s);
      colors.setXYZ(i, r + (1 - r) * 0.75, g + (1 - g) * 0.75, b + (1 - b) * 0.75);
      indices.push(i);
    });
    if (indices.length === 0) return;
    colors.needsUpdate = true;
    pulsedRef.current = { indices };
    pulseTimeoutRef.current = setTimeout(restore, MOTION.reactive.categoryPulseMs);
  }

  // Auto-open object tab when satellite selected on mobile
  useEffect(() => {
    if (selected && isMobile) setMobileTab("object");
  }, [selected, isMobile]);

  // Keep ref in sync so interval closure always reads the latest year
  useEffect(() => { timelineYearRef.current = timelineYear; }, [timelineYear]);

  // Reset every filter, selection, and the timeline/speed back to defaults.
  function resetAll() {
    setActive([]);
    setSelectedCodes([]);
    setPinnedSats(new Set());
    setPinnedViewIndex(0);
    setSelected(null);
    setFocusedIndex(0);
    stopTimelinePlay();
    setTimelineYear(null);
    timelineYearRef.current = null;
    setTimeScale(60);
    timeScaleRef.current = 60;
  }

  // Toggle a category. The scrub list derives from active + selectedCodes, so a
  // toggled-on category shows ALL its codes until you drill into specific ones.
  // Turning a category off also drops any codes selected within it.
  function toggleCategory(id) {
    const turningOn = !active.includes(id);
    const nextActive = turningOn ? [...active, id] : active.filter(c => c !== id);
    setActive(nextActive);

    let nextSelected = selectedCodes;
    if (!turningOn) {
      const catCodes = filterableCodes(id);
      nextSelected = selectedCodes.filter(c => !catCodes.includes(c));
      if (nextSelected.length !== selectedCodes.length) setSelectedCodes(nextSelected);
    }

    // Jump the scrubber to the toggled category's entry (or clamp on removal).
    const next = deriveFocused(nextActive, nextSelected);
    setFocusedIndex(turningOn ? Math.max(0, next.length - 1) : Math.max(0, Math.min(focusedIndex, next.length - 1)));
  }

  // Toggle a country-code chip within a category. Selecting a code narrows that
  // category from "all" to just the selected code(s); deselecting the last one
  // returns it to "all". Sentinel codes (Name:/Type:) are no-ops for the scrub.
  function toggleCode(code, catId) {
    const has = selectedCodes.includes(code);
    const nextSelected = has ? selectedCodes.filter(c => c !== code) : [...selectedCodes, code];
    setSelectedCodes(nextSelected);

    let nextActive = active;
    if (!has && !active.includes(catId)) { nextActive = [...active, catId]; setActive(nextActive); }

    const next = deriveFocused(nextActive, nextSelected);
    if (!has) {
      const idx = next.findIndex(e => e.code === code && e.catId === catId);
      setFocusedIndex(idx >= 0 ? idx : Math.max(0, next.length - 1));
    } else {
      setFocusedIndex(i => Math.max(0, Math.min(i, next.length - 1)));
    }
  }

  function stopTimelinePlay() {
    clearInterval(timelineIntervalRef.current);
    timelineIntervalRef.current = null;
    setTimelinePlaying(false);
  }

  function toggleTimelinePlay() {
    if (timelinePlaying) { stopTimelinePlay(); return; }
    if (timelineYearRef.current === null) {
      timelineYearRef.current = 1957;
      setTimelineYear(1957);
    }
    setTimelinePlaying(true);
    timelineIntervalRef.current = setInterval(() => {
      const next = (timelineYearRef.current ?? 1957) + 1;
      if (next >= CURRENT_YEAR) {
        clearInterval(timelineIntervalRef.current);
        timelineIntervalRef.current = null;
        timelineYearRef.current = null;
        setTimelineYear(null);
        setTimelinePlaying(false);
      } else {
        timelineYearRef.current = next;
        setTimelineYear(next);
      }
    }, 300);
  }

  function stepTimelineBack() {
    stopTimelinePlay();
    setTimelineYear(prev => prev === null ? CURRENT_YEAR - 1 : Math.max(1957, prev - 1));
  }

  function stepTimelineForward() {
    stopTimelinePlay();
    setTimelineYear(prev => prev === null ? null : (prev >= CURRENT_YEAR - 1 ? null : prev + 1));
  }

  // Toggle the ISS tracker. When enabling, queue a fly-to that spins the globe
  // to center the ISS on screen (animation loop consumes flyToISSRef).
  function toggleISS() {
    const enabling = !issEnabled;
    setIssEnabled(enabling);
    if (enabling && issData) {
      const lat = (Number(issData.latitude) * Math.PI) / 180;
      const lon = (Number(issData.longitude) * Math.PI) / 180;
      const r = altToRadius(Number(issData.altitude));
      const xl = r * Math.cos(lat) * Math.cos(lon);
      const zl = r * Math.cos(lat) * Math.sin(lon);
      const yl = r * Math.sin(lat);
      const d = Math.sqrt(xl * xl + zl * zl);
      flyToISSRef.current = { tx: -Math.atan2(yl, d) * 0.4, ty: Math.atan2(-xl, zl) };
    }
  }

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 7;
    cameraRef.current = camera;

    // Lighter GPU settings on phones/tablets — skip MSAA and cap the pixel ratio
    // lower (the two biggest mobile GPU costs).
    const mobileGpu = computeIsMobile();
    const renderer = new THREE.WebGLRenderer({ antialias: !mobileGpu, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileGpu ? 1.5 : 2));
    const mountEl = mountRef.current; // stable handle for the effect cleanup
    mountEl.appendChild(renderer.domElement);

    // Earth globe
    const earthGeo = new THREE.SphereGeometry(0.98, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      "/earth-dark.jpg"
    );
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: 0x00d4ff,
      shininess: 15,
      depthWrite: true,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthRef.current = earth;
    scene.add(earth);

    // Wireframe overlay for that military grid look
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, opacity: 0.08, transparent: true });
    const wire = new THREE.Mesh(new THREE.SphereGeometry(0.981, 32, 32), wireMat);
    scene.add(wire);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(1.05, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x00d4ff, transparent: true, opacity: 0.05, side: THREE.FrontSide
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0x00d4ff, 1);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // Starfield — REAL view only. One reused Points sphere, far behind orbits.
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      // Uniform direction sampling so stars don't cluster at the poles
      const u = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u);
      starPos[i * 3] = rr * Math.cos(ph) * 90;
      starPos[i * 3 + 1] = u * 90;
      starPos[i * 3 + 2] = rr * Math.sin(ph) * 90;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false });
    const stars = new THREE.Points(starGeo, starMat);
    stars.visible = false;
    scene.add(stars);

    // ── MOON scope: detailed lunar globe at Earth's framing ──────────────
    // Hidden until the MOON tab is selected. Same radius as Earth's globe so
    // the camera, drag, and zoom feel identical when the body switches.
    const moonGeo = new THREE.SphereGeometry(0.98, 64, 64);
    const moonMat = new THREE.MeshPhongMaterial({ color: 0x9a9a94, shininess: 2 });
    const moonGlobe = new THREE.Mesh(moonGeo, moonMat);
    moonGlobe.visible = false;
    scene.add(moonGlobe);

    // Landing-site markers — one Points cloud, child of the moon globe so
    // they ride its rotation. Hover raycast resolves the site for a tooltip.
    const sitePosArr = new Float32Array(LUNAR_SITES.length * 3);
    LUNAR_SITES.forEach((s, i) => {
      const [x, y, z] = lunarLatLonToXYZ(s.lat, s.lon, 0.985);
      sitePosArr[i * 3] = x; sitePosArr[i * 3 + 1] = y; sitePosArr[i * 3 + 2] = z;
    });
    const siteGeo = new THREE.BufferGeometry();
    siteGeo.setAttribute("position", new THREE.BufferAttribute(sitePosArr, 3));
    const siteMat = new THREE.PointsMaterial({ size: 0.028, color: 0x00ff88, sizeAttenuation: true, depthWrite: false });
    const sitePoints = new THREE.Points(siteGeo, siteMat);
    sitePoints.renderOrder = 2;
    moonGlobe.add(sitePoints);

    // Lunar orbiters — ring + animated dot per spacecraft, children of the
    // moon globe. Altitudes scale off the 1737 km lunar radius.
    const lunarSats = LUNAR_ORBITERS.map(o => {
      const r = 0.98 * (1 + o.alt / 1737) + 0.03; // small visual lift so rings clear the surface
      const inc = (o.inclination * Math.PI) / 180;
      const ringPts = [];
      for (let j = 0; j <= 96; j++) {
        const th = (j / 96) * Math.PI * 2;
        ringPts.push(r * Math.cos(th), r * Math.sin(th) * Math.sin(inc), r * Math.sin(th) * Math.cos(inc));
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute("position", new THREE.Float32BufferAttribute(ringPts, 3));
      const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(o.color), transparent: true, opacity: 0.35 }));
      moonGlobe.add(ring);
      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute("position", new THREE.Float32BufferAttribute([r, 0, 0], 3).setUsage(THREE.DynamicDrawUsage));
      const dot = new THREE.Points(dotGeo, new THREE.PointsMaterial({ size: 0.022, color: new THREE.Color(o.color), sizeAttenuation: true, depthWrite: false }));
      dot.renderOrder = 2;
      moonGlobe.add(dot);
      return { ...o, r, inc, theta: Math.random() * Math.PI * 2, dotGeo, ring, dot };
    });

    // ── SOLAR scope: stylized model of the whole system ──────────────────
    // Sun at origin, planets on circular orbit rings at their REAL mean
    // longitudes for the sim date (the arrangement matches the actual sky).
    // Distances/sizes are compressed — see utils/bodies.js. Clicking a
    // planet navigates to that body's individual view.
    const solarGroup = new THREE.Group();
    solarGroup.visible = false;
    solarGroup.rotation.x = 0.45; // pleasant 3/4 viewing tilt
    scene.add(solarGroup);
    const sunGeo = new THREE.SphereGeometry(1.15, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffbb33 });
    solarGroup.add(new THREE.Mesh(sunGeo, sunMat));
    const sunLight = new THREE.PointLight(0xfff2dd, 1.6, 0, 0);
    solarGroup.add(sunLight); // only lights while the group is visible
    const planetMeshes = PLANETS.map(p => {
      const ringPts = [];
      for (let j = 0; j <= 128; j++) {
        const th = (j / 128) * Math.PI * 2;
        ringPts.push(p.dist * Math.cos(th), 0, p.dist * Math.sin(th));
      }
      const orbGeo = new THREE.BufferGeometry();
      orbGeo.setAttribute("position", new THREE.Float32BufferAttribute(ringPts, 3));
      const orb = new THREE.Line(orbGeo, new THREE.LineBasicMaterial({ color: 0x335577, transparent: true, opacity: 0.5 }));
      solarGroup.add(orb);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.size, 32, 32),
        new THREE.MeshPhongMaterial({ color: p.color, shininess: 6 })
      );
      mesh.userData.bodyId = p.id;
      solarGroup.add(mesh);
      if (p.id === "saturn") {
        const sr = new THREE.Mesh(
          new THREE.RingGeometry(p.size * 1.3, p.size * 2.1, 48),
          new THREE.MeshBasicMaterial({ color: 0xcdb98a, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
        );
        sr.rotation.x = Math.PI / 2 - 0.35;
        sr.userData.bodyId = p.id;
        mesh.add(sr);
      }
      return { p, mesh, orb };
    });

    // Generic globe reused by every individual planet view (texture cached
    // per body; flat color until it streams in).
    const genericGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.98, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 4 })
    );
    genericGlobe.visible = false;
    scene.add(genericGlobe);

    // Expose the restylable scene objects to the view/scope toggles
    viewRefsRef.current = { earth, earthMat, wire, wireMat, atmos: atmosMesh, atmosMat, dirLight, stars, moonGlobe, sitePoints, lunarSats, solarGroup, planetMeshes, genericGlobe, planetTexCache: {}, moonTexTried: false, dragTargetRef: { current: earth }, realMat: null, loadingReal: false, sunLocal: null, lastSunCalc: 0 };

    // Ambient living layers — radar sweep, atmosphere breathing, one-at-a-time
    // satellite glow. Quiet texture, staggered periods (see fx/ambient.js).
    const ambientFX = createAmbientFX({
      scene, earth, camera, atmosMat,
      getSats: () => pointsRef.current?.satObjects,
    });

    // Auto-scan mode — after ~4s idle the globe surveys itself, locking a
    // reticle onto one interesting satellite at a time (see fx/autoScan.js).
    const autoScan = createAutoScan({
      earth, wire, camera,
      getSats: () => pointsRef.current?.satObjects,
      getSelected: () => selectedRef.current,
      isMobile: () => isMobileRef.current,
    });
    // ANY user input stops the scan instantly; it resumes after the idle timeout.
    const onAnyInput = () => autoScan.notifyUserInput();
    window.addEventListener("mousedown", onAnyInput);
    window.addEventListener("mousemove", onAnyInput);
    window.addEventListener("wheel", onAnyInput);
    window.addEventListener("touchstart", onAnyInput);
    window.addEventListener("keydown", onAnyInput);


    // Shared raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.018;

    // Hover highlight — single point updated on mousemove
    let hoveredIdx = -1;
    let hoveredPlanetId = null; // solar scope: planet under the cursor
    let lastHoverTime = 0; // throttle hover raycasts to ~30/s
    const hoverGeo = new THREE.BufferGeometry();
    hoverGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const hoverMat = new THREE.PointsMaterial({
      size: 0.024,
      color: 0xffffff,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const hoverPoint = new THREE.Points(hoverGeo, hoverMat);
    hoverPoint.renderOrder = 3;
    hoverPoint.frustumCulled = false;
    hoverPoint.visible = false;
    earth.add(hoverPoint);

    // Mouse drag to rotate
    let isDragging = false;
    let dragMoved = false;
    let prevMouse = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };
    let lastTouchTime = 0; // suppress synthesized "ghost" mouse events right after a touch
    const onMouseDown = e => {
      if (Date.now() - lastTouchTime < 600) return;
      flyToISSRef.current = null;
      isDragging = true;
      dragMoved = false;
      prevMouse = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = e => {
      if (isMobileRef.current) return;
      if (Date.now() - lastTouchTime < 600) return;
      if (isDragging) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        if (Math.abs(e.clientX - mouseDownPos.x) > 4 || Math.abs(e.clientY - mouseDownPos.y) > 4) dragMoved = true;
        // Rotate whichever body is active (Earth or the Moon)
        const body = viewRefsRef.current?.dragTargetRef.current || earth;
        body.rotation.y += dx * 0.005;
        body.rotation.x += dy * 0.005;
        wire.rotation.y = earth.rotation.y;
        wire.rotation.x = earth.rotation.x;
        prevMouse = { x: e.clientX, y: e.clientY };
        return;
      }
      // Hover detection when idle — throttled, raycasting 21k points every
      // mousemove event is wasteful since events outpace the screen refresh.
      const nowH = performance.now();
      if (nowH - lastHoverTime < 32) return;
      lastHoverTime = nowH;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      // SOLAR scope: hover resolves planets; click navigates to that body
      if (scopeRef.current === "solar") {
        hoveredIdx = -1;
        hoverPoint.visible = false;
        const v = viewRefsRef.current;
        const tip = tooltipRef.current;
        if (!v?.planetMeshes || !tip) return;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(v.planetMeshes.map(x => x.mesh), true);
        const bodyId = hits.length ? (hits[0].object.userData.bodyId || hits[0].object.parent?.userData.bodyId) : null;
        if (bodyId) {
          hoveredPlanetId = bodyId;
          const p = PLANETS.find(pl => pl.id === bodyId);
          tip.innerHTML = `<div>${p.label}</div><div class="hud-tooltip-sub">CLICK TO VISIT</div>`;
          tip.style.left = `${e.clientX + 14}px`;
          tip.style.top = `${e.clientY + 12}px`;
          tip.style.display = "block";
          document.body.style.cursor = "pointer";
        } else {
          hoveredPlanetId = null;
          tip.style.display = "none";
          document.body.style.cursor = "default";
        }
        return;
      }
      // MOON scope: hover resolves landing sites instead of satellites
      if (scopeRef.current === "moon") {
        hoveredIdx = -1; // never carry a stale satellite hover across scopes
        hoverPoint.visible = false;
        const sp = viewRefsRef.current?.sitePoints;
        const tip = tooltipRef.current;
        if (!sp || !tip) return;
        raycaster.setFromCamera(mouse, camera);
        const sHits = raycaster.intersectObject(sp);
        if (sHits.length > 0) {
          const site = LUNAR_SITES[sHits[0].index];
          tip.innerHTML = `<div>${site.name}</div><div class="hud-tooltip-sub">${site.org} · ${site.year} · ${site.type}</div>`;
          tip.style.left = `${e.clientX + 14}px`;
          tip.style.top = `${e.clientY + 12}px`;
          tip.style.display = "block";
          document.body.style.cursor = "pointer";
        } else {
          tip.style.display = "none";
          document.body.style.cursor = "default";
        }
        return;
      }
      const { points, satObjects } = pointsRef.current;
      if (!points || !satObjects) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(points);
      if (hits.length > 0) {
        hoveredIdx = hits[0].index;
        const sat = satObjects[hoveredIdx];
        hoverMat.color.set(CATEGORIES.find(c => c.id === sat.category)?.color || "#ffffff");
        const pos = hoverGeo.getAttribute("position");
        pos.setXYZ(0, sat.x, sat.y, sat.z);
        pos.needsUpdate = true;
        hoverPoint.visible = true;
        document.body.style.cursor = "pointer";
        // Cursor-following tooltip (reactive tier — instant, imperative DOM)
        const tip = tooltipRef.current;
        if (tip) {
          tip.innerHTML = `<div>${(sat.object_name || "UNKNOWN")}</div><div class="hud-tooltip-sub">NORAD ${sat.norad_cat_id}${sat.apoapsis ? ` · ${Math.round(sat.apoapsis)} KM` : ""}</div>`;
          tip.style.left = `${e.clientX + 14}px`;
          tip.style.top = `${e.clientY + 12}px`;
          tip.style.display = "block";
        }
      } else {
        hoveredIdx = -1;
        hoverPoint.visible = false;
        document.body.style.cursor = "default";
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      }
    };

    // Click uses already-hovered index — no double raycast needed
    // Guard: only process clicks directly on the WebGL canvas so UI panel clicks don't clear the selection
    const onClick = e => {
      if (isMobileRef.current) return;
      if (Date.now() - lastTouchTime < 600) return;
      if (dragMoved) return;
      if (e.target !== renderer.domElement) return;
      // Solar scope: clicking a planet navigates to its individual view
      if (scopeRef.current === "solar") {
        if (hoveredPlanetId) setScope(hoveredPlanetId);
        return;
      }
      if (scopeRef.current !== "earth") return;
      if (hoveredIdx >= 0) {
        const { satObjects } = pointsRef.current;
        if (satObjects) setSelected(satObjects[hoveredIdx]);
      } else {
        setSelected(null);
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    // Zoom — bounds depend on the active scope (solar view sits much farther out)
    const onWheel = e => {
      scopeZTargetRef.current = null; // user takes over from any glide
      const b = zoomBoundsRef.current;
      camera.position.z = Math.min(b.max, Math.max(b.min, camera.position.z + e.deltaY * 0.005 * (camera.position.z / 5)));
    };
    window.addEventListener("wheel", onWheel);

    // Touch — drag to rotate, pinch to zoom, tap to select
    let lastTouchDist = null;
    const performTapSelect = (clientX, clientY) => {
      const { points, satObjects } = pointsRef.current;
      if (!points || !satObjects) return;
      const mouse = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(points);
      if (hits.length > 0) setSelected(satObjects[hits[0].index]);
      else setSelected(null);
    };
    const onTouchStart = e => {
      lastTouchTime = Date.now();
      // Only the globe canvas drives rotation/zoom/select — let touches on UI
      // overlays (sheets, sliders, lists) keep their native scroll/drag.
      if (e.target !== renderer.domElement) return;
      if (e.touches.length === 1) {
        isDragging = true; dragMoved = false;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = e => {
      lastTouchTime = Date.now();
      // Touchmove keeps the touchstart target, so this only fires for canvas
      // drags — UI overlays scroll natively (no preventDefault stealing it).
      if (e.target !== renderer.domElement) return;
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        if (Math.abs(e.touches[0].clientX - mouseDownPos.x) > 4 || Math.abs(e.touches[0].clientY - mouseDownPos.y) > 4) dragMoved = true;
        const body = viewRefsRef.current?.dragTargetRef.current || earth;
        body.rotation.y += dx * 0.005;
        body.rotation.x += dy * 0.005;
        wire.rotation.y = earth.rotation.y;
        wire.rotation.x = earth.rotation.x;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && lastTouchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const b = zoomBoundsRef.current;
        camera.position.z = Math.min(b.max, Math.max(b.min, camera.position.z - (dist - lastTouchDist) * 0.01));
        lastTouchDist = dist;
      }
    };
    const onTouchEnd = e => {
      lastTouchTime = Date.now();
      if (e.target === renderer.domElement && !dragMoved && e.changedTouches.length === 1 && !mobileTabRef.current) {
        performTapSelect(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      isDragging = false;
      lastTouchDist = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    // Animation loop — renderer.setAnimationLoop (not rAF/setInterval) so the
    // loop is owned by the renderer and properly cancelled on unmount.
    const CHUNK = 3000;
    let lastInfoLog = 0;
    const animate = () => {
      // Camera glide when the scope switches framing (e.g. into solar view)
      if (scopeZTargetRef.current != null) {
        camera.position.z += (scopeZTargetRef.current - camera.position.z) * 0.1;
        if (Math.abs(camera.position.z - scopeZTargetRef.current) < 0.05) scopeZTargetRef.current = null;
      }
      // Fly-to animation (ISS toggle uses a gentle 0.06; clicking a satellite
      // passes speed ~0.3 for a decisive ~200ms arc — cinematic, not slow)
      if (flyToISSRef.current) {
        const { tx, ty, speed = 0.06 } = flyToISSRef.current;
        const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * t; };
        // Rotate the active body (Earth, or the Moon when flying to a site)
        const body = viewRefsRef.current?.dragTargetRef.current || earth;
        body.rotation.x = lerpAngle(body.rotation.x, tx, speed);
        body.rotation.y = lerpAngle(body.rotation.y, ty, speed);
        wire.rotation.x = earth.rotation.x;
        wire.rotation.y = earth.rotation.y;
        const dxA = Math.abs(lerpAngle(body.rotation.x, tx, 1));
        const dyA = Math.abs(lerpAngle(body.rotation.y, ty, 1));
        if (dxA < 0.001 && dyA < 0.001) flyToISSRef.current = null;
      } else if (!isDragging) {
        earth.rotation.y += 0.0000012 * timeScaleRef.current;
        wire.rotation.y += 0.0000012 * timeScaleRef.current;
      }
      if (issMarkerRef.current?.material) {
        const zoomScale = Math.max(1, camera.position.z / 2);
        issMarkerRef.current.material.size = (0.030 + Math.sin(Date.now() * 0.003) * 0.010) * zoomScale;
      }
      // ISS halo ping
      const halo = issHaloRef.current;
      if (halo) {
        // Marker visibility alone isn't enough — off-Earth scopes hide the
        // marker via its parent (earth), but the halo is scene-level.
        const issVisible = issMarkerRef.current?.visible && earth.visible;
        halo.visible = !!issVisible;
        if (issVisible) {
          const attr = issMarkerRef.current.geometry.getAttribute("position");
          issHaloVec.current.set(attr.getX(0), attr.getY(0), attr.getZ(0));
          issHaloVec.current.applyMatrix4(earth.matrixWorld);
          halo.position.copy(issHaloVec.current);
          halo.lookAt(camera.position);
          const zoomScale = Math.max(1, camera.position.z / 2);
          const t = (Date.now() % 2000) / 2000;
          halo.scale.setScalar((0.02 + t * 0.14) * zoomScale);
          halo.material.opacity = (1 - t) * 0.35;
        }
      }
      // Fade satellite points in after worker delivers them
      const pMat = pointsRef.current?.mat;
      if (pMat && pMat.opacity < 1) {
        pMat.opacity = Math.min(1, pMat.opacity + 0.04);
      }

      // Advance satellite positions in chunks
      const frameTime = performance.now();
      const dt = lastFrameTimeRef.current ? Math.min(frameTime - lastFrameTimeRef.current, 100) * timeScaleRef.current : 0;
      lastFrameTimeRef.current = frameTime;
      const { geo: pGeo, satObjects: pSats } = pointsRef.current;
      if (pGeo && pSats?.length) {
        const pa = pGeo.getAttribute("position");
        let chunkStart = -1, chunkCount = 0;
        if (dt > 0) {
          const start = chunkIdxRef.current;
          const end = Math.min(start + CHUNK, pSats.length);
          for (let i = start; i < end; i++) {
            const s = pSats[i];
            if (!s.angularSpeed || s.timelineHidden) continue;
            s.theta += s.angularSpeed * dt;
            const xOrb = s.a * Math.cos(s.theta) - s.c;
            const zOrb = s.b * Math.sin(s.theta);
            // Same Keplerian math as orbit lines — both are Earth-local children of earth mesh
            const nx = xOrb * s.cosR - zOrb * s.cosI * s.sinR;
            const ny = zOrb * s.sinI;
            const nz = xOrb * s.sinR + zOrb * s.cosI * s.cosR;
            pa.array[i * 3]     = nx;
            pa.array[i * 3 + 1] = ny;
            pa.array[i * 3 + 2] = nz;
            s.x = nx; s.y = ny; s.z = nz;
          }
          chunkStart = start; chunkCount = end - start;
          chunkIdxRef.current = end >= pSats.length ? 0 : end;
        }
        // Upload the whole buffer when filters just changed; otherwise only the
        // chunk that moved (avoids re-uploading all ~21k points every frame).
        if (fullPosUpdateRef.current) {
          fullPosUpdateRef.current = false;
          pa.needsUpdate = true;
        } else if (chunkCount > 0) {
          pa.addUpdateRange(chunkStart * 3, chunkCount * 3);
          pa.needsUpdate = true;
        }
      }

      // Traveling glow sweeping the selected orbital path (~3.2s per lap)
      const tg = travelGlowRef.current;
      if (tg) {
        const phase = (frameTime % 3200) / 3200;
        const fIdx = phase * tg.n;
        const i0 = Math.floor(fIdx) % tg.n;
        const i1 = (i0 + 1) % tg.n;
        const frac = fIdx - Math.floor(fIdx);
        const p = tg.geo.getAttribute("position");
        p.setXYZ(0,
          tg.pts[i0 * 3] + (tg.pts[i1 * 3] - tg.pts[i0 * 3]) * frac,
          tg.pts[i0 * 3 + 1] + (tg.pts[i1 * 3 + 1] - tg.pts[i0 * 3 + 1]) * frac,
          tg.pts[i0 * 3 + 2] + (tg.pts[i1 * 3 + 2] - tg.pts[i0 * 3 + 2]) * frac);
        p.needsUpdate = true;
      }

      // Realistic view: the sun follows the SIM clock — it advances at the
      // same timeScale as the satellites (dt is already sim-milliseconds), so
      // speeding up the sim visibly sweeps the terminator around the globe.
      // The world-space direction follows the globe's rotation every frame so
      // day/night stays glued to the right geography while dragging.
      sunTimeRef.current += dt;
      const vr = viewRefsRef.current;
      if (realViewRef.current && vr?.realMat) {
        if (!vr.sunLocal) vr.sunLocal = new THREE.Vector3();
        subsolarLocalDir(new Date(sunTimeRef.current), vr.sunLocal);
        const sunW = vr.realMat.uniforms.sunDir.value;
        sunW.copy(vr.sunLocal).applyQuaternion(earth.quaternion);
        dirLight.position.copy(sunW).multiplyScalar(5); // atmosphere shading follows
      }
      // SOLAR scope: place each planet at its mean longitude for the sim date
      if (scopeRef.current === "solar" && vr?.planetMeshes) {
        for (const { p, mesh } of vr.planetMeshes) {
          const lon = (planetLongitudeDeg(p, sunTimeRef.current) * Math.PI) / 180;
          mesh.position.set(p.dist * Math.cos(lon), 0, -p.dist * Math.sin(lon));
        }
      }

      // MOON scope: advance the lunar orbiters along their rings (sim time)
      if (scopeRef.current === "moon" && vr?.lunarSats && dt > 0) {
        for (const o of vr.lunarSats) {
          o.theta += (2 * Math.PI / (o.period * 60 * 1000)) * dt;
          const p = o.dotGeo.getAttribute("position");
          p.setXYZ(0, o.r * Math.cos(o.theta), o.r * Math.sin(o.theta) * Math.sin(o.inc), o.r * Math.sin(o.theta) * Math.cos(o.inc));
          p.needsUpdate = true;
        }
      }

      // Ambient living layers + auto-scan are Earth-scope systems
      if (scopeRef.current === "earth") {
        ambientFX.update(frameTime);
        autoScan.update(frameTime);
      } else {
        ambientFX.setActive(false);
        autoScan.notifyUserInput(); // keeps the scan parked while on the Moon
      }

      renderer.render(scene, camera);

      // Perf guardrail: surface draw calls in dev (target < 15 at idle)
      if (process.env.NODE_ENV === "development" && frameTime - lastInfoLog > 5000) {
        lastInfoLog = frameTime;
        console.log(`[perf] draw calls: ${renderer.info.render.calls}, triangles: ${renderer.info.render.triangles}`);
      }
    };
    renderer.setAnimationLoop(animate);

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Load satellites from Supabase (or the demo catalog when no .env)
    async function loadSats() {
      // No credentials → synthesize a realistic catalog so the app still runs
      if (!supabase) {
        console.warn("[orbit-atlas] No Supabase credentials in .env — using synthetic demo catalog.");
        const { generateDemoCatalog } = await import("./utils/demoCatalog");
        const worker = new Worker(new URL("./satWorker.js", import.meta.url));
        activeWorkerRef.current = worker;
        worker.onmessage = ({ data: { posArr, colArr, satObjects } }) => {
          satsRef.current = satObjects;
          const geo = new THREE.BufferGeometry();
          const posAttr = new THREE.Float32BufferAttribute(posArr, 3);
          posAttr.setUsage(THREE.DynamicDrawUsage);
          geo.setAttribute("position", posAttr);
          geo.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));
          const mat = new THREE.PointsMaterial({ size: 0.008, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, depthTest: true });
          const points = new THREE.Points(geo, mat);
          points.frustumCulled = false;
          points.renderOrder = 1;
          earth.add(points);
          pointsRef.current = { geo, mat, satObjects, points };
          setVisibleCount(satObjects.length);
          setLastSync(Date.now());
          worker.terminate();
          activeWorkerRef.current = null;
        };
        worker.onerror = (e) => { console.error("satWorker error:", e); setLoading(false); };
        worker.postMessage({ sats: generateDemoCatalog() });
        return;
      }
      const pageSize = 1000;
      // TLE lines omitted on purpose — they were ~70% of the payload. Positions are
      // placed via Keplerian elements in the worker; the ISS fetches its own TLE.
      const COLS = "norad_cat_id, object_name, object_type, country_code, inclination, apoapsis, periapsis, period, launch_date";

      // Ask Supabase for the total row count using head:true — sends no rows,
      // just reads the Content-Range header which contains the total count.
      const { count } = await supabase
        .from("satellites")
        .select("*", { count: "exact", head: true })
        .neq("object_type", "DEBRIS");

      const totalPages = Math.ceil((count || 0) / pageSize);

      // Build one fetch promise per page. Array.from with a mapping function is
      // a clean way to generate [0, 1, 2, ..., totalPages-1] and immediately
      // transform each index into a Supabase query. At this point the requests
      // haven't fired yet — they're just Promise objects sitting in an array.
      const fetches = Array.from({ length: totalPages }, (_, i) =>
        supabase
          .from("satellites")
          .select(COLS)
          .neq("object_type", "DEBRIS")
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      // Promise.all fires every request simultaneously, then waits until the
      // last one lands. Total wait = slowest single page, not the sum of all pages.
      // flatMap collapses [[page0rows], [page1rows], ...] into one flat array.
      const results = await Promise.all(fetches);
      const data = results.flatMap(r => r.data ?? []);

      // Hand off all the heavy SGP4 math to a background worker so the main
      // thread stays free to respond to user input while positions are computed.
      const worker = new Worker(new URL("./satWorker.js", import.meta.url));
      activeWorkerRef.current = worker;

      worker.onmessage = ({ data: { posArr, colArr, satObjects } }) => {
        satsRef.current = satObjects;

        const geo = new THREE.BufferGeometry();
        const posAttr = new THREE.Float32BufferAttribute(posArr, 3);
        posAttr.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute("position", posAttr);
        geo.setAttribute("color", new THREE.Float32BufferAttribute(colArr, 3));

        const mat = new THREE.PointsMaterial({
          size: 0.008,
          vertexColors: true,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
        });

        const points = new THREE.Points(geo, mat);
        points.frustumCulled = false;
        points.renderOrder = 1;
        earth.add(points);
        pointsRef.current = { geo, mat, satObjects, points };

        setVisibleCount(satObjects.length);
        setLastSync(Date.now());
        worker.terminate();
        activeWorkerRef.current = null;
      };

      worker.onerror = (e) => {
        console.error("satWorker error:", e);
        setLoading(false);
      };

      // Send raw Supabase rows to the worker — it handles all propagation
      worker.postMessage({ sats: data });
    }

    // ISS marker
    const issMarkerGeo = new THREE.BufferGeometry();
    issMarkerGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3).setUsage(THREE.DynamicDrawUsage));
    const issMarkerMat = new THREE.PointsMaterial({ size: 0.035, color: 0xFFD700, sizeAttenuation: true, depthWrite: false });
    const issMarkerMesh = new THREE.Points(issMarkerGeo, issMarkerMat);
    issMarkerMesh.renderOrder = 4;
    issMarkerMesh.frustumCulled = false;
    issMarkerMesh.visible = false;
    earth.add(issMarkerMesh);
    issMarkerRef.current = issMarkerMesh;

    // ISS halo ping (world-space ring, camera-facing, animated)
    const issHaloGeo = new THREE.RingGeometry(0.9, 1.0, 64);
    const issHaloMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const issHaloMesh = new THREE.Mesh(issHaloGeo, issHaloMat);
    issHaloMesh.renderOrder = 3;
    issHaloMesh.frustumCulled = false;
    issHaloMesh.visible = false;
    scene.add(issHaloMesh);
    issHaloRef.current = issHaloMesh;

    // ISS past trail
    const trailPosBuf = new Float32Array(ISS_TRAIL_LEN * 3);
    const trailColBuf = new Float32Array(ISS_TRAIL_LEN * 3);
    const issTrailGeo = new THREE.BufferGeometry();
    issTrailGeo.setAttribute("position", new THREE.Float32BufferAttribute(trailPosBuf, 3).setUsage(THREE.DynamicDrawUsage));
    issTrailGeo.setAttribute("color",    new THREE.Float32BufferAttribute(trailColBuf, 3).setUsage(THREE.DynamicDrawUsage));
    issTrailGeo.setDrawRange(0, 0);
    const issTrailMesh = new THREE.Line(issTrailGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    issTrailMesh.frustumCulled = false;
    earth.add(issTrailMesh);
    issTrailRef.current = { mesh: issTrailMesh, history: [] };

    // ISS future orbit path
    const futurePosBuf = new Float32Array(111 * 3);
    const issFutureGeo = new THREE.BufferGeometry();
    issFutureGeo.setAttribute("position", new THREE.Float32BufferAttribute(futurePosBuf, 3).setUsage(THREE.DynamicDrawUsage));
    issFutureGeo.setDrawRange(0, 0);
    const issFutureMesh = new THREE.Line(issFutureGeo, new THREE.LineBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.25 }));
    issFutureMesh.frustumCulled = false;
    earth.add(issFutureMesh);
    issFutureRef.current = issFutureMesh;

    loadSats();
    setLoading(false);

    return () => {
      if (timelineIntervalRef.current) clearInterval(timelineIntervalRef.current);
      if (isolatedOrbitRef.current) {
        isolatedOrbitRef.current.geometry.dispose();
        isolatedOrbitRef.current.material.dispose();
        isolatedOrbitRef.current = null;
      }
      if (activeWorkerRef.current) {
        activeWorkerRef.current.terminate();
        activeWorkerRef.current = null;
      }
      introTimeoutsRef.current.forEach(clearTimeout);
      introTimeoutsRef.current = [];
      renderer.setAnimationLoop(null);
      ambientFX.dispose();
      autoScan.dispose();
      starGeo.dispose();
      starMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      siteGeo.dispose();
      siteMat.dispose();
      lunarSats.forEach(o => {
        o.ring.geometry.dispose(); o.ring.material.dispose();
        o.dotGeo.dispose(); o.dot.material.dispose();
      });
      sunGeo.dispose();
      sunMat.dispose();
      planetMeshes.forEach(({ mesh, orb }) => {
        mesh.geometry.dispose(); mesh.material.dispose();
        mesh.children.forEach(c => { c.geometry?.dispose(); c.material?.dispose(); });
        orb.geometry.dispose(); orb.material.dispose();
      });
      genericGlobe.geometry.dispose();
      genericGlobe.material.dispose();
      Object.values(viewRefsRef.current?.planetTexCache || {}).forEach(t => t.dispose());
      if (viewRefsRef.current?.realMat) viewRefsRef.current.realMat.dispose();
      window.removeEventListener("mousedown", onAnyInput);
      window.removeEventListener("mousemove", onAnyInput);
      window.removeEventListener("wheel", onAnyInput);
      window.removeEventListener("touchstart", onAnyInput);
      window.removeEventListener("keydown", onAnyInput);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.body.style.cursor = "default";
      hoverGeo.dispose();
      hoverMat.dispose();
      issMarkerGeo.dispose();
      issMarkerMat.dispose();
      issHaloGeo.dispose();
      issHaloMat.dispose();
      issTrailGeo.dispose();
      issTrailMesh.material.dispose();
      issFutureGeo.dispose();
      issFutureMesh.material.dispose();
      renderer.dispose();
      if (mountEl && renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update dot visibility and orbit shells when filters change
  useEffect(() => {
    const { geo, satObjects } = pointsRef.current;
    if (!geo || !satObjects) return;

    // Returns filterable country codes for a category (excludes name/type sentinels).
    // Memoized per effect run so the rest_of_world full scan happens once, not per-satellite.
    const filterableCodesCache = {};
    const getFilterableCodes = (catId) => {
      if (catId in filterableCodesCache) return filterableCodesCache[catId];
      let codes;
      if (catId === "rest_of_world") {
        codes = [...new Set(satObjects.filter(s => s.category === "rest_of_world" && s.country_code).map(s => s.country_code))];
      } else {
        codes = (CATEGORY_CODES[catId] || []).filter(c => !c.startsWith("Name:") && !c.startsWith("Type:") && c !== "All other codes");
      }
      filterableCodesCache[catId] = codes;
      return codes;
    };

    // Per-category: if any selected codes belong to this cat, filter to those; else show all in cat
    const satVisible = (sat) => {
      if (timelineYear !== null) {
        const launchYear = sat.launch_date ? parseInt(sat.launch_date.substring(0, 4), 10) : null;
        if (!launchYear || launchYear > timelineYear) return false;
      }
      const inCat = active.length === 0 || active.includes(sat.category);
      if (!inCat) return false;
      const catCodes = getFilterableCodes(sat.category);
      const selectedInCat = selectedCodes.filter(c => catCodes.includes(c));
      // filterKey = generation for Starlink, country code otherwise
      return selectedInCat.length === 0 || selectedInCat.includes(sat.filterKey);
    };

    // Pre-computed RGB per category — avoids allocating a new THREE.Color per satellite
    const catRGB = Object.fromEntries(
      CATEGORIES.map(cat => {
        const c = new THREE.Color(cat.color);
        return [cat.id, [c.r, c.g, c.b]];
      })
    );

    // Update dot colors and positions
    const pa = geo.getAttribute("position");
    const newColors = [];
    satObjects.forEach((sat, i) => {
      const launchYear = sat.launch_date ? parseInt(sat.launch_date.substring(0, 4), 10) : null;
      const notYetLaunched = timelineYear !== null && (!launchYear || launchYear > timelineYear);

      const inPinSet = pinnedSats.size > 0 && pinnedSats.has(sat);
      const isSelected = !!selected && sat.norad_cat_id === selected.norad_cat_id;

      // Hide sats that are pin-excluded, not yet launched, or filtered out by
      // the active category/code filters — no more dim grey dots. Selecting a
      // sat no longer hides the rest: they dim instead (focus, not isolation).
      const shouldHide =
        (pinnedSats.size > 0 && !inPinSet) ||
        (!inPinSet && !isSelected && !satVisible(sat));

      if (shouldHide || notYetLaunched) {
        pa.array[i * 3] = 0; pa.array[i * 3 + 1] = 0; pa.array[i * 3 + 2] = 0;
        newColors.push(0, 0, 0);
        sat.timelineHidden = true;
        return;
      }

      // Restore position for sats coming out of hidden state or that are pinned/selected
      if (sat.timelineHidden || inPinSet || isSelected) {
        pa.array[i * 3] = sat.x; pa.array[i * 3 + 1] = sat.y; pa.array[i * 3 + 2] = sat.z;
      }
      sat.timelineHidden = false;
      if (isSelected) {
        newColors.push(1, 0.95, 0.1); // bright gold
      } else {
        let [r, g, b] = catRGB[sat.category] || [1, 1, 1];
        // REAL view: category colors fight the realism — sats become
        // near-white specks (a hint of hue survives for the legend)
        if (realView) { r += (1 - r) * 0.8; g += (1 - g) * 0.8; b += (1 - b) * 0.8; }
        // While a sat is selected, everything else recedes — focal hierarchy
        const dim = (pinnedSats.size === 0 && !!selected) ? MOTION.select.dimOthers : 1;
        newColors.push(r * dim, g * dim, b * dim);
      }
    });
    fullPosUpdateRef.current = true; // all dot positions changed — full upload next frame
    geo.setAttribute("color", new THREE.Float32BufferAttribute(newColors, 3));
    geo.attributes.color.needsUpdate = true;

    const count = satObjects.filter(satVisible).length;
    setVisibleCount(count);

    // Remove old orbit lines
    const earth = earthRef.current;
    shellsRef.current.forEach(obj => {
      if (earth) earth.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    shellsRef.current = [];

    if (selected || active.length === 0 || !earth) return;

    const MAX_ORBITS = 300;
    const N = 72; // points per orbit

    // Pinned-satellite rings are drawn in their own effect (keyed on pinnedViewIndex)
    // so cycling the ‹ › arrows doesn't re-run this whole dot-recolor pass.
    if (pinnedSats.size > 0) return;

    active.forEach(catId => {
      const selectedInCat = selectedCodes.filter(c => getFilterableCodes(catId).includes(c));
      const catSats = satObjects.filter(s =>
        s.category === catId &&
        s.apoapsis != null &&
        s.inclination != null &&
        !s.timelineHidden &&
        (selectedInCat.length === 0 || selectedInCat.includes(s.filterKey))
      );
      if (catSats.length === 0) return;

      const catColor = new THREE.Color(CATEGORIES.find(c => c.id === catId)?.color || "#ffffff");
      if (realView) catColor.lerp(new THREE.Color(1, 1, 1), 0.7); // desaturate rings in REAL view

      // Sample evenly when category has more sats than MAX_ORBITS
      const step = Math.max(1, Math.floor(catSats.length / MAX_ORBITS));
      const sampled = catSats.filter((_, i) => i % step === 0).slice(0, MAX_ORBITS);
      const opacity = Math.max(0.12, 0.35 - (sampled.length / MAX_ORBITS) * 0.23);

      const positions = [];

      sampled.forEach(sat => {
        const inc = (sat.inclination * Math.PI) / 180;
        const raan = sat.lon ?? (sat.norad_cat_id % 628) / 100; // deterministic fallback
        const sinI = Math.sin(inc);
        const cosI = Math.cos(inc);
        const sinR = Math.sin(raan);
        const cosR = Math.cos(raan);

        const rApo  = altToRadius(sat.apoapsis);
        const rPeri = altToRadius(sat.periapsis ?? sat.apoapsis);
        const a = (rApo + rPeri) / 2;
        const c = (rApo - rPeri) / 2;
        const b = Math.sqrt(Math.max(0, a * a - c * c));

        // Build orbit points: ellipse in orbital plane, then rotate by inclination + RAAN
        const pts = [];
        for (let j = 0; j < N; j++) {
          const theta = (j / N) * Math.PI * 2;
          const xOrb = a * Math.cos(theta) - c; // Earth at focus
          const zOrb = b * Math.sin(theta);

          // Rotate by inclination around X-axis (tilts plane toward poles)
          const x   = xOrb;
          const y   = zOrb * sinI;
          const zeq = zOrb * cosI;

          // Rotate by RAAN around Y-axis (sets ascending node longitude)
          pts.push(x * cosR - zeq * sinR, y, x * sinR + zeq * cosR);
        }

        // Pack as LineSegments pairs (closed loop)
        for (let j = 0; j < N; j++) {
          const j3 = j * 3;
          const n3 = ((j + 1) % N) * 3;
          positions.push(pts[j3], pts[j3 + 1], pts[j3 + 2]);
          positions.push(pts[n3], pts[n3 + 1], pts[n3 + 2]);
        }
      });

      const orbitGeo = new THREE.BufferGeometry();
      orbitGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const orbitLines = new THREE.LineSegments(orbitGeo, new THREE.LineBasicMaterial({
        color: catColor,
        transparent: true,
        opacity,
      }));
      orbitLines.renderOrder = 2;
      earth.add(orbitLines);
      shellsRef.current.push(orbitLines);
    });
  }, [active, selectedCodes, timelineYear, selected, pinnedSats, realView]);

  // Pinned-satellite orbit rings — isolated from the main filter effect so cycling
  // the ‹ › arrows (pinnedViewIndex) only redraws these few rings, not all 21k dots.
  // Same guards as the category-ring branch: suppressed while a sat is selected,
  // when no category is active, or when nothing is pinned.
  useEffect(() => {
    const earth = earthRef.current;
    if (selected || active.length === 0 || !earth || pinnedSats.size === 0) return;

    const N = 72;
    const pinnedArr = [...pinnedSats];
    const activeSat = pinnedArr[Math.min(pinnedViewIndex, pinnedArr.length - 1)];
    pinnedArr.forEach(sat => {
      if (!sat.apoapsis || !sat.inclination) return;
      const isActive = sat === activeSat;
      const catColor = isActive ? new THREE.Color(0xDDEEFF) : new THREE.Color(CATEGORIES.find(c => c.id === sat.category)?.color || "#ffffff");
      const inc  = (sat.inclination * Math.PI) / 180;
      const raan = sat.lon ?? (sat.norad_cat_id % 628) / 100;
      const sinI = Math.sin(inc), cosI = Math.cos(inc);
      const sinR = Math.sin(raan), cosR = Math.cos(raan);
      const rApo  = altToRadius(sat.apoapsis);
      const rPeri = altToRadius(sat.periapsis ?? sat.apoapsis);
      const a = (rApo + rPeri) / 2;
      const c = (rApo - rPeri) / 2;
      const b = Math.sqrt(Math.max(0, a * a - c * c));

      const pts = [];
      for (let j = 0; j < N; j++) {
        const theta = (j / N) * Math.PI * 2;
        const xOrb = a * Math.cos(theta) - c;
        const zOrb = b * Math.sin(theta);
        const x = xOrb, y = zOrb * sinI, zeq = zOrb * cosI;
        pts.push(x * cosR - zeq * sinR, y, x * sinR + zeq * cosR);
      }
      const positions = [];
      for (let j = 0; j < N; j++) {
        const j3 = j * 3, n3 = ((j + 1) % N) * 3;
        positions.push(pts[j3], pts[j3+1], pts[j3+2], pts[n3], pts[n3+1], pts[n3+2]);
      }
      const orbitGeo = new THREE.BufferGeometry();
      orbitGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const orbitLines = new THREE.LineSegments(orbitGeo, new THREE.LineBasicMaterial({ color: catColor, transparent: true, opacity: isActive ? 0.95 : 0.5 }));
      orbitLines.renderOrder = 2;
      earth.add(orbitLines);
      pinnedShellsRef.current.push(orbitLines);
    });

    return () => {
      pinnedShellsRef.current.forEach(obj => {
        if (earthRef.current) earthRef.current.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
      });
      pinnedShellsRef.current = [];
    };
  }, [pinnedSats, pinnedViewIndex, selected, active]);

  // Keep pinnedSatsRef in sync for animation loop reads
  useEffect(() => { pinnedSatsRef.current = pinnedSats; }, [pinnedSats]);

  // ── Realistic view toggle ──────────────────────────────────────────────
  // TACTICAL (default): dark map, cyan wireframe + lighting — the HUD look.
  // REALISTIC: day/night shader lit from the sun's ACTUAL position for the
  // current UTC time — city lights glow on the night side, the terminator
  // sits on the correct geography, and a faint starfield replaces the HUD
  // blue. Textures load lazily on first use: local /earth-real.jpg and
  // /earth-night.jpg win if present (drop your own into public/), else CDN
  // copies; if loading fails we quietly stay on the tactical map.
  const realViewRef = useRef(false);
  useEffect(() => {
    realViewRef.current = realView;
    const v = viewRefsRef.current;
    const earth = earthRef.current;
    if (!v || !earth) return;
    if (realView) {
      if (v.realMat) {
        earth.material = v.realMat;
      } else if (!v.loadingReal) {
        v.loadingReal = true;
        const loader = new THREE.TextureLoader();
        const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
        const dayP = load("/earth-real.jpg").catch(() => load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"));
        const nightP = load("/earth-night.jpg").catch(() => load("https://unpkg.com/three-globe/example/img/earth-night.jpg"));
        Promise.all([dayP, nightP]).then(([day, night]) => {
          day.colorSpace = THREE.SRGBColorSpace;
          night.colorSpace = THREE.SRGBColorSpace;
          v.realMat = createRealEarthMaterial(day, night);
          v.sunLocal = subsolarLocalDir();
          v.lastSunCalc = 0;
          if (realViewRef.current && earthRef.current) earthRef.current.material = v.realMat;
        }).catch(() => {
          v.loadingReal = false;
          console.warn("[orbit-atlas] realistic textures unavailable — staying on tactical map");
        });
      }
      v.wire.visible = false;
      v.stars.visible = true;
      v.dirLight.color.set(0xffffff);
      v.atmosMat.color.set(0x5588cc);
    } else {
      earth.material = v.earthMat; // original tactical phong material
      v.wire.visible = scopeRef.current === "earth";
      v.stars.visible = scopeRef.current !== "earth"; // stars stay for other bodies
      v.dirLight.color.set(0x00d4ff);
      v.atmosMat.color.set(0x00d4ff);
    }
  }, [realView]);

  // Fly the moon globe to a landing site (same arc mechanism as satellites)
  function flyToSite(site) {
    const [xl, yl, zl] = lunarLatLonToXYZ(site.lat, site.lon, 0.985);
    const d = Math.sqrt(xl * xl + zl * zl);
    flyToISSRef.current = { tx: -Math.atan2(yl, d) * 0.8, ty: Math.atan2(-xl, zl), speed: 0.18 };
  }

  // ── Select cinematic: arc the globe to the chosen satellite (~200ms) ──
  // Same rotation math as the ISS fly-to but with a decisive lerp speed.
  // The globe rotates — the camera never flies (panels keep their frame).
  useEffect(() => {
    if (!selected || isMobile) return;
    const { x: xl, y: yl, z: zl } = selected;
    if (xl == null) return;
    const d = Math.sqrt(xl * xl + zl * zl);
    flyToISSRef.current = { tx: -Math.atan2(yl, d) * 0.4, ty: Math.atan2(-xl, zl), speed: 0.3 };
  }, [selected, isMobile]);

  // Hide ISS when timeline is set before its launch year (Zarya module: Nov 1998) or tracker is toggled off
  useEffect(() => {
    const hidden = !issEnabled || (timelineYear !== null && timelineYear < 1998);
    if (issMarkerRef.current) issMarkerRef.current.visible = !hidden;
    if (issTrailRef.current?.mesh) issTrailRef.current.mesh.visible = !hidden;
    if (issFutureRef.current) issFutureRef.current.visible = !hidden;
  }, [timelineYear, issEnabled]);

  // Isolated orbit ring for selected satellite
  useEffect(() => {
    const earth = earthRef.current;
    if (isolatedOrbitRef.current) {
      if (earth) earth.remove(isolatedOrbitRef.current);
      isolatedOrbitRef.current.geometry.dispose();
      isolatedOrbitRef.current.material.dispose();
      isolatedOrbitRef.current = null;
    }
    if (!selected || !earth || !selected.a) return;

    const { a, b, c, sinI, cosI, sinR, cosR } = selected;
    const N = 128;
    const pts = [];
    for (let j = 0; j < N; j++) {
      const theta = (j / N) * Math.PI * 2;
      const xOrb = a * Math.cos(theta) - c;
      const zOrb = b * Math.sin(theta);
      const zeq  = zOrb * cosI;
      pts.push(xOrb * cosR - zeq * sinR, zOrb * sinI, xOrb * sinR + zeq * cosR);
    }
    const segs = [];
    for (let j = 0; j < N; j++) {
      const j3 = j * 3, n3 = ((j + 1) % N) * 3;
      segs.push(pts[j3], pts[j3+1], pts[j3+2], pts[n3], pts[n3+1], pts[n3+2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
    const catColor = new THREE.Color(CATEGORIES.find(cat => cat.id === selected.category)?.color || "#ffffff");
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: catColor, transparent: true, opacity: 0.9 }));
    line.renderOrder = 3;
    earth.add(line);
    isolatedOrbitRef.current = line;

    // Traveling glow — a single bright point sweeping the selected orbit so
    // the path reads as live telemetry, not a static ring (focal tier).
    if (MOTION.select.travelGlow) {
      const glowGeo = new THREE.BufferGeometry();
      glowGeo.setAttribute("position", new THREE.Float32BufferAttribute([pts[0], pts[1], pts[2]], 3).setUsage(THREE.DynamicDrawUsage));
      const glowMat = new THREE.PointsMaterial({ size: 0.02, color: catColor.clone().lerp(new THREE.Color(1, 1, 1), 0.6), sizeAttenuation: true, depthWrite: false, transparent: true, opacity: 0.9 });
      const glowPt = new THREE.Points(glowGeo, glowMat);
      glowPt.renderOrder = 3;
      glowPt.frustumCulled = false;
      earth.add(glowPt);
      travelGlowRef.current = { pts, n: N, geo: glowGeo, mat: glowMat, mesh: glowPt };
    }
    return () => {
      const tg = travelGlowRef.current;
      if (tg) {
        if (earthRef.current) earthRef.current.remove(tg.mesh);
        tg.geo.dispose();
        tg.mat.dispose();
        travelGlowRef.current = null;
      }
    };
  }, [selected]);

  // ISS live tracking
  useEffect(() => {
    function drawFuturePath(satrec) {
      const futureObj = issFutureRef.current;
      if (!futureObj) return;
      const posAttr = futureObj.geometry.getAttribute("position");
      const pts = [];
      const now = Date.now();
      for (let i = 0; i <= 110; i++) {
        const t = new Date(now + i * 50 * 1000);
        const pv = satellite.propagate(satrec, t);
        if (!pv?.position) continue;
        const gmst = satellite.gstime(t);
        const geo = satellite.eciToGeodetic(pv.position, gmst);
        const [x, y, z] = latLonToXYZ(
          satellite.degreesLat(geo.latitude),
          satellite.degreesLong(geo.longitude),
          geo.height
        );
        pts.push(x, y, z);
      }
      for (let i = 0; i < pts.length; i++) posAttr.array[i] = pts[i];
      posAttr.needsUpdate = true;
      futureObj.geometry.setDrawRange(0, pts.length / 3);
    }

    async function fetchTLE() {
      if (!supabase) return; // demo mode: no TLE source — live ISS marker still works
      const { data } = await supabase
        .from("satellites")
        .select("tle_line1, tle_line2")
        .eq("norad_cat_id", 25544)
        .single();
      if (!data?.tle_line1) return;
      const satrec = satellite.twoline2satrec(data.tle_line1.trim(), data.tle_line2.trim());
      issSatrecRef.current = satrec;
      drawFuturePath(satrec);
    }

    async function pollISS() {
      try {
        const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
        const d = await res.json();
        setIssData(d);
        setLastSync(Date.now()); // drives the header SYNC stamp + icon ping

        const [x, y, z] = latLonToXYZ(d.latitude, d.longitude, d.altitude);

        // Update marker
        const marker = issMarkerRef.current;
        if (marker) {
          const pos = marker.geometry.getAttribute("position");
          pos.setXYZ(0, x, y, z);
          pos.needsUpdate = true;
          marker.visible = true;
        }

        // Update past trail
        const trailRef = issTrailRef.current;
        if (trailRef) {
          trailRef.history.push([x, y, z]);
          if (trailRef.history.length > ISS_TRAIL_LEN) trailRef.history.shift();
          const count = trailRef.history.length;
          const posArr = trailRef.mesh.geometry.getAttribute("position").array;
          const colArr = trailRef.mesh.geometry.getAttribute("color").array;
          for (let i = 0; i < count; i++) {
            const [tx, ty, tz] = trailRef.history[i];
            const fade = (i + 1) / count;
            posArr[i * 3]     = tx; posArr[i * 3 + 1] = ty; posArr[i * 3 + 2] = tz;
            colArr[i * 3]     = ISS_COLOR.r * fade;
            colArr[i * 3 + 1] = ISS_COLOR.g * fade;
            colArr[i * 3 + 2] = ISS_COLOR.b * fade;
          }
          trailRef.mesh.geometry.getAttribute("position").needsUpdate = true;
          trailRef.mesh.geometry.getAttribute("color").needsUpdate = true;
          trailRef.mesh.geometry.setDrawRange(0, count);
        }
      } catch (e) {
        console.warn("ISS poll failed:", e);
      }
    }

    fetchTLE();
    pollISS();
    const id = setInterval(pollISS, 5000);
    return () => clearInterval(id);
  }, []);

  // Highlight selected satellite
  useEffect(() => {
    const earth = earthRef.current;
    if (highlightRef.current) {
      if (earth) earth.remove(highlightRef.current);
      highlightRef.current.geometry.dispose();
      highlightRef.current.material.dispose();
      highlightRef.current = null;
    }
    if (!selected || !earth) return;

    const hlGeo = new THREE.BufferGeometry();
    hlGeo.setAttribute("position", new THREE.Float32BufferAttribute([selected.x, selected.y, selected.z], 3));
    const hlMat = new THREE.PointsMaterial({
      size: 0.028,
      color: 0xffffff,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const hl = new THREE.Points(hlGeo, hlMat);
    hl.renderOrder = 3;
    hl.frustumCulled = false;
    earth.add(hl);
    highlightRef.current = hl;
  }, [selected]);

  return (
    <div style={{ background: realView ? "#000206" : C.bg, transition: "background 0.4s ease-out", width: "100%", height: "100%", overflow: "hidden", position: "relative", fontFamily: FONT }}>
      {/* Loading overlay */}
      {showOverlay && <LoadingOverlay fading={overlayFading} />}

      {/* Globe */}
      <div ref={mountRef} style={{ position: "absolute", inset: 0, touchAction: "none" }} />

      {/* Satellite hover tooltip — positioned imperatively by the raycast */}
      <div ref={tooltipRef} className="hud-tooltip" />

      {/* Welcome message — visible between loading screen and satellite fade-in */}
      {showWelcome && <WelcomeBanner isMobile={isMobile} visible={welcomeVisible && !welcomeExiting} />}

      {/* Header */}
      <Header isMobile={isMobile} showObjectsLabel={wideHeader} loading={loading} visibleCount={visibleCount} lastSync={lastSync} simTime={simTime} onSyncTime={syncSimTime} onMenuClick={() => setAboutOpen(true)} onKeyClick={() => setGlobalKeyOpen(true)} realView={realView} onToggleView={() => setRealView(v => !v)} scope={scope} onScopeChange={setScope} />

      {/* About panel */}
      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <GlobalKey open={globalKeyOpen} onClose={() => setGlobalKeyOpen(false)} sats={satsRef.current} isMobile={isMobile} />
      <ResetButton
        isMobile={isMobile}
        show={active.length > 0 || selectedCodes.length > 0 || focusedCodes.length > 0 || !!selected || pinnedSats.size > 0 || timelineYear !== null || timeScale !== 60}
        onReset={resetAll}
      />

      {/* ── DESKTOP LAYOUT ── */}
      {!isMobile && (
        <>
          {/* MOON scope — lunar sites + orbiters replace the Earth panels */}
          {scope === "moon" && <LunarPanel onFlyToSite={flyToSite} />}

          {/* SOLAR scope — quiet hint; the model itself is the interface */}
          {scope === "solar" && (
            <div style={{ position: "absolute", top: 92, left: "50%", transform: "translateX(-50%)", color: `${C.cyan}55`, fontSize: 10, letterSpacing: 2, pointerEvents: "none" }}>
              PLANETS AT REAL POSITIONS FOR SIM DATE · CLICK A PLANET TO VISIT
            </div>
          )}

          {/* Individual planet view — compact fact card */}
          {(() => {
            const planet = scope !== "earth" && scope !== "moon" && scope !== "solar" ? PLANETS.find(p => p.id === scope) : null;
            if (!planet) return null;
            return (
              <div className="hud-card" style={{ position: "absolute", top: 80, right: 20, width: 240, background: `${C.bg}cc`, border: `1px solid ${C.cyan}33`, borderRadius: 8, padding: "16px 16px", backdropFilter: "blur(10px)" }}>
                <div style={{ color: C.cyan, fontSize: 13, letterSpacing: 3, fontWeight: "bold", marginBottom: 12 }}>{planet.label}</div>
                {Object.entries({ DIAMETER: planet.facts.diameter, "DAY LENGTH": planet.facts.day, "YEAR LENGTH": planet.facts.year, "ORBIT": `${planet.dist >= 9.6 ? "OUTER" : "INNER"} SYSTEM` }).map(([k, val], i) => (
                  <div key={k} className="hud-row-in" style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, animationDelay: `${i * 20}ms` }}>
                    <span style={{ color: `${C.cyan}66`, fontSize: 10, letterSpacing: 1 }}>{k}</span>
                    <span style={{ color: C.white, fontSize: 12 }}>{val}</span>
                  </div>
                ))}
                <div onClick={() => setScope("solar")} className="hud-press" style={{ marginTop: 12, textAlign: "center", color: `${C.cyan}88`, fontSize: 10, letterSpacing: 2, cursor: "pointer", border: `1px solid ${C.cyan}33`, borderRadius: 4, padding: "6px 0" }}>
                  ← SOLAR SYSTEM
                </div>
              </div>
            );
          })()}

          {/* Left panel — filter (top 70%) + country codes (bottom 30%).
              Each section is a collapsible instrument module: header bar stays,
              content height-collapses in 180ms ease-out. */}
          {scope === "earth" && (
          <div onWheel={e => e.stopPropagation()} className="hud-card" style={{ position: "absolute", top: 80, left: 20, width: 300, bottom: 150, background: `${C.bg}cc`, border: `1px solid ${C.cyan}33`, borderRadius: 8, backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            <CollapsibleSection title="FILTER OBJECTS" openFlex={7} style={{ padding: "14px 14px 0" }}>
              <FilterPanel
                isMobile={false}
                bare
                active={active}
                onToggleCategory={toggleCategory}
                onHoverCategory={setCategoryPulse}
                onReset={() => { setActive([]); setSelectedCodes([]); setPinnedSats(new Set()); setPinnedViewIndex(0); setSelected(null); setFocusedIndex(0); }}
              />
            </CollapsibleSection>

            <div style={{ borderTop: `1px solid ${C.cyan}22`, flexShrink: 0 }} />

            <CollapsibleSection title="COUNTRY CODES" openFlex={3} style={{ padding: "16px 14px" }}>
              <CountryCodesPanel
                isMobile={false}
                bare
                active={active}
                selectedCodes={selectedCodes}
                sats={satsRef.current}
                onToggleCode={toggleCode}
                onToggleCategory={toggleCategory}
                onHoverCategory={setCategoryPulse}
                onReset={() => { setSelectedCodes([]); setPinnedSats(new Set()); setPinnedViewIndex(0); setSelected(null); setFocusedIndex(0); }}
              />
            </CollapsibleSection>

          </div>
          )}

          {/* Right panel — satellite viewer (top 70%) + object data (bottom 30%) */}
          {scope === "earth" && (
          <SatelliteViewer
            sats={satsRef.current}
            focusedCodes={focusedCodes}
            focusedIndex={focusedIndex}
            setFocusedIndex={setFocusedIndex}
            pinnedSats={pinnedSats}
            setPinnedSats={setPinnedSats}
            pinnedViewIndex={pinnedViewIndex}
            setPinnedViewIndex={setPinnedViewIndex}
            selected={selected}
            setSelected={setSelected}
            setSelectedCodes={setSelectedCodes}
            setActive={setActive}
          />
          )}

          {/* Bottom center — Timeline + Speed side by side */}
          <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, alignItems: "stretch" }}>

            {/* Timeline — Earth launch history; hidden on the Moon */}
            {scope === "earth" && (
            <div className="hud-card" style={{ background: `${C.bg}cc`, border: `1px solid ${C.cyan}33`, borderRadius: 8, padding: "12px 20px", backdropFilter: "blur(10px)", minWidth: 240 }}>
              <TimelineControl
                isMobile={false}
                timelineYear={timelineYear}
                setTimelineYear={setTimelineYear}
                currentYear={CURRENT_YEAR}
                timelinePlaying={timelinePlaying}
                onStepBack={stepTimelineBack}
                onTogglePlay={toggleTimelinePlay}
                onStepForward={stepTimelineForward}
              />
            </div>
            )}

            {/* Speed Control */}
            <div className="hud-card" style={{ background: `${C.bg}cc`, border: `1px solid ${C.cyan}33`, borderRadius: 8, padding: "12px 20px", backdropFilter: "blur(10px)", textAlign: "center", minWidth: 260 }}>
              <SpeedControl
                isMobile={false}
                timeScale={timeScale}
                onChange={v => { setTimeScale(v); timeScaleRef.current = v; }}
              />
            </div>

            {/* Local time — sim clock in a selectable zone, with SYNC NOW */}
            <div className="hud-card" style={{ background: `${C.bg}cc`, border: `1px solid ${C.cyan}33`, borderRadius: 8, padding: "12px 16px", backdropFilter: "blur(10px)", textAlign: "center" }}>
              <LocalTimePanel isMobile={false} getSimTime={() => sunTimeRef.current} onSync={syncSimTime} />
            </div>

            {/* ISS Tracker — click to toggle; Earth scope only */}
            {scope === "earth" && (
            <ISSPanel
              isMobile={false}
              issData={issData}
              issEnabled={issEnabled}
              issHover={issHover}
              timelineYear={timelineYear}
              onHoverChange={setIssHover}
              onToggle={toggleISS}
            />
            )}
          </div>

        </>
      )}

      {/* ── MOBILE LAYOUT ── */}
      {isMobile && (
        <>
          {/* Tap outside the sheet (above the tab bar) to close it */}
          {mobileTab && (
            <div onClick={() => setMobileTab(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 64, zIndex: 499 }} />
          )}

          {/* Bottom sheet — slides up when a tab is open. The object tab is a
              fixed-height flex column (its list scrolls internally) so it doesn't
              grow/shrink as you scrub; other tabs size to their content. */}
          {mobileTab && (
            <div style={{ position: "fixed", bottom: 64, left: 0, right: 0, background: `${C.bg}f0`, borderTop: `1px solid ${C.cyan}33`, borderRadius: "14px 14px 0 0", padding: "18px 20px 12px", height: mobileTab === "object" && (focusedCodes.length > 0 || selected) ? "58vh" : undefined, maxHeight: "58vh", overflowY: mobileTab === "object" && (focusedCodes.length > 0 || selected) ? "hidden" : "auto", backdropFilter: "blur(16px)", zIndex: 500, display: "flex", flexDirection: "column" }}>

              {mobileTab === "filter" && (
                <FilterPanel
                  isMobile={true}
                  active={active}
                  onToggleCategory={toggleCategory}
                  onReset={() => { setActive([]); setSelectedCodes([]); }}
                />
              )}

              {mobileTab === "codes" && (
                <CountryCodesPanel
                  isMobile={true}
                  active={active}
                  selectedCodes={selectedCodes}
                  sats={satsRef.current}
                  onToggleCode={toggleCode}
                  onToggleCategory={toggleCategory}
                  onReset={() => setSelectedCodes([])}
                />
              )}

              {mobileTab === "object" && (
                <MobileObjectData
                  selected={selected}
                  setSelected={setSelected}
                  focusedCodes={focusedCodes}
                  focusedIndex={focusedIndex}
                  setFocusedIndex={setFocusedIndex}
                  sats={satsRef.current}
                />
              )}

              {mobileTab === "iss" && (
                <ISSPanel isMobile={true} issData={issData} issEnabled={issEnabled} timelineYear={timelineYear} onToggle={toggleISS} />
              )}

              {mobileTab === "time" && (
                <>
                  <TimelineControl
                    isMobile={true}
                    timelineYear={timelineYear}
                    setTimelineYear={setTimelineYear}
                    currentYear={CURRENT_YEAR}
                    timelinePlaying={timelinePlaying}
                    onStepBack={stepTimelineBack}
                    onTogglePlay={toggleTimelinePlay}
                    onStepForward={stepTimelineForward}
                  />
                  <div style={{ borderTop: `1px solid ${C.cyan}22`, margin: "14px 0" }} />
                  <LocalTimePanel isMobile={true} getSimTime={() => sunTimeRef.current} onSync={syncSimTime} />
                </>
              )}

              {mobileTab === "speed" && (
                <SpeedControl
                  isMobile={true}
                  timeScale={timeScale}
                  onChange={v => { setTimeScale(v); timeScaleRef.current = v; }}
                />
              )}
            </div>
          )}

          {/* Bottom tab bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: C.bg, borderTop: `1px solid ${C.cyan}22`, display: "flex", zIndex: 600 }}>
            {[
              { id: "filter", label: "FILTER",  icon: "≡",  color: C.cyan, badge: active.length > 0 },
              { id: "codes",  label: "CODES",   icon: "⊞",  color: C.cyan, badge: selectedCodes.length > 0 },
              { id: "object", label: "OBJECT",  icon: "◎",  color: C.cyan, badge: !!selected || focusedCodes.length > 0 },
              { id: "iss",    label: "ISS",     icon: "◉",  color: C.gold, badge: issEnabled },
              { id: "time",   label: "TIME",    icon: (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.2" /><path d="M8 4.6 V8 L10.3 9.6" /></svg>), color: C.cyan, badge: timelineYear !== null },
              { id: "speed",  label: "SPEED",   icon: (<svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.6 12 a5.7 5.7 0 1 1 10.8 0" /><path d="M8 8.4 L11 6" /><circle cx="8" cy="8.4" r="0.9" fill="currentColor" stroke="none" /></svg>), color: C.cyan, badge: timeScale !== 60 },
            ].map(tab => {
              const isActive = mobileTab === tab.id;
              return (
                <div key={tab.id} onClick={() => setMobileTab(prev => prev === tab.id ? null : tab.id)}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 3, borderTop: `2px solid ${isActive ? tab.color : "transparent"}`, background: isActive ? `${tab.color}11` : "transparent", transition: "background 0.15s", position: "relative" }}>
                  {tab.badge && <div style={{ position: "absolute", top: 8, right: "calc(50% - 10px)", width: 6, height: 6, borderRadius: "50%", background: tab.color, boxShadow: `0 0 6px ${tab.color}` }} />}
                  <div style={{ fontSize: 16, color: isActive ? tab.color : `${tab.color}66` }}>{tab.icon}</div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, color: isActive ? tab.color : `${tab.color}66` }}>{tab.label}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Analytics />
      <SpeedInsights />
    </div>
  );
}
