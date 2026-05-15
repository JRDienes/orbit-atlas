import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { createClient } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export const CATEGORIES = [
  { id: "starlink",       label: "SpaceX / Starlink",   color: "#00D4FF" }, // SpaceX cyan
  { id: "kuiper",         label: "Amazon Kuiper",       color: "#FF9900" }, // Amazon orange
  { id: "ast_spacemobile", label: "AST SpaceMobile",   color: "#CC44FF" }, // AST purple
  { id: "us",            label: "United States",      color: "#4488FF" }, // US flag blue
  { id: "uk",            label: "United Kingdom",     color: "#FF2244" }, // Union Jack red
  { id: "europe",        label: "Europe / ESA",       color: "#FFEE00" }, // EU flag gold
  { id: "russia",        label: "Russia",             color: "#FF3333" }, // Russia red
  { id: "china",         label: "China",              color: "#DD0000" }, // China flag red
  { id: "japan",         label: "Japan",              color: "#FF66AA" }, // Cherry blossom
  { id: "india",         label: "India",              color: "#FF7700" }, // India saffron
  { id: "middle_east",   label: "Middle East",        color: "#FFB700" }, // Gulf gold
  { id: "asia_pacific",  label: "Asia Pacific",       color: "#00DDAA" }, // Pacific teal
  { id: "rest_of_world", label: "Rest of World",      color: "#AAAAAA" }, // Neutral grey
  { id: "debris",        label: "Debris",             color: "#FF5500" }, // Warning orange
  { id: "rocket_body",   label: "Rocket Bodies",      color: "#778899" }, // Slate
];

const CATEGORY_CODES = {
  starlink:       ["Name: STARLINK"],
  kuiper:         ["Name: KUIPER"],
  ast_spacemobile: ["Name: BLUEBIRD", "Name: SPACEMOBILE"],
  us:            ["US", "CA", "AUS", "NZ", "GLOB", "ORB", "O3B", "ITSO"],
  uk:            ["UK", "IM"],
  europe:        ["FR", "GER", "IT", "SPN", "NOR", "SWED", "BEL", "NETH", "SWTZ", "DEN",
                  "FIN", "POR", "POL", "CZE", "CZCH", "HUN", "ROM", "EST", "LTU", "HRV",
                  "SVN", "FGER", "GREC", "LUXE", "TURK", "ESA", "EUME", "EUTE", "SES", "FRIT"],
  russia:        ["CIS", "BELA", "KAZ", "UKR", "AZER", "SEAL", "TMMC", "STCT"],
  china:         ["PRC", "CHBZ", "CHLE", "NICO", "ABS", "PAKI", "LAOS", "NKOR"],
  japan:         ["JPN"],
  india:         ["IND"],
  middle_east:   ["SAUD", "UAE", "QAT", "KWT", "BHR", "JOR", "IRAN", "IRAQ", "AB"],
  asia_pacific:  ["SKOR", "INDO", "MALA", "THAI", "SING", "BGD", "TWN", "ASRA", "RP"],
  rest_of_world: ["All other codes"],
  debris:        ["Type: DEBRIS"],
  rocket_body:   ["Type: ROCKET BODY"],
};

function categorize(sat) {
  const name = sat.object_name?.toUpperCase() || "";
  const country = sat.country_code || "";
  const type = sat.object_type?.toUpperCase() || "";

  // Name-based constellations — exclusive, checked first
  if (name.includes("STARLINK")) return "starlink";
  if (name.includes("KUIPER")) return "kuiper";
  if (name.includes("BLUEBIRD") || name.includes("SPACEMOBILE")) return "ast_spacemobile";

  // Object type
  if (type === "DEBRIS") return "debris";
  if (type === "ROCKET BODY") return "rocket_body";

  // United States, Five Eyes & US-operated
  if (
    ["US", "CA", "AUS", "NZ", "GLOB", "ORB", "O3B", "ITSO"].includes(country) ||
    name.includes("NROL") || name.includes("NAVSTAR") || name.includes("MILSTAR") ||
    name.includes("AEHF") || name.includes("WGS") || name.includes("USA ")
  ) return "us";

  // United Kingdom
  if (["UK", "IM"].includes(country)) return "uk";

  // Europe / ESA
  if (["FR", "GER", "IT", "SPN", "NOR", "SWED", "BEL", "NETH", "SWTZ", "DEN",
       "FIN", "POR", "POL", "CZE", "CZCH", "HUN", "ROM", "EST", "LTU", "HRV",
       "SVN", "FGER", "GREC", "LUXE", "TURK",
       "ESA", "EUME", "EUTE", "SES", "FRIT"].includes(country))
    return "europe";

  // Russia & sphere
  if (["CIS", "BELA", "KAZ", "UKR", "AZER", "SEAL", "TMMC", "STCT"].includes(country))
    return "russia";

  // China & sphere
  if (["PRC", "CHBZ", "CHLE", "NICO", "ABS", "PAKI", "LAOS", "NKOR"].includes(country))
    return "china";

  // Japan
  if (country === "JPN") return "japan";

  // India
  if (country === "IND") return "india";

  // Middle East
  if (["SAUD", "UAE", "QAT", "KWT", "BHR", "JOR", "IRAN", "IRAQ", "AB"].includes(country))
    return "middle_east";

  // Asia Pacific
  if (["SKOR", "INDO", "MALA", "THAI", "SING", "BGD", "TWN", "ASRA", "RP"].includes(country))
    return "asia_pacific";

  return "rest_of_world";
}

function altToRadius(altKm) {
  return 1.05 + Math.log(1 + Math.min(Math.max(200, altKm), 42000) / 6371);
}

function latLonToXYZ(latDeg, lonDeg, altKm) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r = altToRadius(altKm);
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)];
}

const ISS_TRAIL_LEN = 18;
const ISS_COLOR = new THREE.Color("#FFD700");

export default function App() {
  const mountRef = useRef(null);
  const [active, setActive] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayFading, setOverlayFading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [issData, setIssData] = useState(null);
  const satsRef = useRef([]);
  const pointsRef = useRef([]);
  const sceneRef = useRef(null);
  const earthRef = useRef(null);
  const shellsRef = useRef([]);
  const highlightRef = useRef(null);
  const issMarkerRef = useRef(null);
  const issTrailRef = useRef(null);
  const issFutureRef = useRef(null);
  const issSatrecRef = useRef(null);
  const chunkIdxRef = useRef(0);
  const lastFrameTimeRef = useRef(null);
  const timeScaleRef = useRef(60);
  const [timeScale, setTimeScale] = useState(60);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileTab, setMobileTab] = useState(null);
  const mobileTabRef = useRef(null);
  const isMobileRef = useRef(window.innerWidth < 768);

  // Fade out loading overlay once data is ready
  useEffect(() => {
    if (!loading) {
      setOverlayFading(true);
      const t = setTimeout(() => setShowOverlay(false), 900);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Track mobile breakpoint
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      isMobileRef.current = mobile;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keep mobileTabRef in sync so touch handlers can read current value
  useEffect(() => { mobileTabRef.current = mobileTab; }, [mobileTab]);

  // Auto-open object tab when satellite selected on mobile
  useEffect(() => {
    if (selected && isMobile) setMobileTab("object");
  }, [selected, isMobile]);

  // Toggle category filter
  function toggleCategory(id) {
    setActive(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

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
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0x00d4ff, 1);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);


    // Shared raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.018;

    // Hover highlight — single point updated on mousemove
    let hoveredIdx = -1;
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
    const onMouseDown = e => {
      isDragging = true;
      dragMoved = false;
      prevMouse = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = e => {
      if (isMobileRef.current) return;
      if (isDragging) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        if (Math.abs(e.clientX - mouseDownPos.x) > 4 || Math.abs(e.clientY - mouseDownPos.y) > 4) dragMoved = true;
        earth.rotation.y += dx * 0.005;
        earth.rotation.x += dy * 0.005;
        wire.rotation.y = earth.rotation.y;
        wire.rotation.x = earth.rotation.x;
        prevMouse = { x: e.clientX, y: e.clientY };
        return;
      }
      // Hover detection when idle
      const { points, satObjects } = pointsRef.current;
      if (!points || !satObjects) return;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
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
      } else {
        hoveredIdx = -1;
        hoverPoint.visible = false;
        document.body.style.cursor = "default";
      }
    };

    // Click uses already-hovered index — no double raycast needed
    const onClick = e => {
      if (isMobileRef.current) return;
      if (dragMoved) return;
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

    // Zoom
    const onWheel = e => { camera.position.z = Math.min(9, Math.max(1.5, camera.position.z + e.deltaY * 0.005)); };
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
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        if (Math.abs(e.touches[0].clientX - mouseDownPos.x) > 4 || Math.abs(e.touches[0].clientY - mouseDownPos.y) > 4) dragMoved = true;
        earth.rotation.y += dx * 0.005;
        earth.rotation.x += dy * 0.005;
        wire.rotation.y = earth.rotation.y;
        wire.rotation.x = earth.rotation.x;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && lastTouchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        camera.position.z = Math.min(9, Math.max(1.5, camera.position.z - (dist - lastTouchDist) * 0.01));
        lastTouchDist = dist;
      }
    };
    const onTouchEnd = e => {
      if (!dragMoved && e.changedTouches.length === 1 && !mobileTabRef.current) {
        performTapSelect(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      isDragging = false;
      lastTouchDist = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    // Animation loop
    const CHUNK = 3000;
    const animate = () => {
      requestAnimationFrame(animate);
      if (!isDragging) { earth.rotation.y += 0.0000012 * timeScaleRef.current; wire.rotation.y += 0.0000012 * timeScaleRef.current; }
      if (issMarkerRef.current?.material) {
        issMarkerRef.current.material.size = 0.030 + Math.sin(Date.now() * 0.003) * 0.010;
      }

      // Advance satellite positions in chunks
      const frameTime = performance.now();
      const dt = lastFrameTimeRef.current ? Math.min(frameTime - lastFrameTimeRef.current, 100) * timeScaleRef.current : 0;
      lastFrameTimeRef.current = frameTime;
      const { geo: pGeo, satObjects: pSats } = pointsRef.current;
      if (pGeo && pSats?.length && dt > 0) {
        const pa = pGeo.getAttribute("position");
        const start = chunkIdxRef.current;
        const end = Math.min(start + CHUNK, pSats.length);
        for (let i = start; i < end; i++) {
          const s = pSats[i];
          if (!s.angularSpeed) continue;
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
        pa.needsUpdate = true;
        chunkIdxRef.current = end >= pSats.length ? 0 : end;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Load satellites from Supabase
    async function loadSats() {
      setLoading(true);
      let allData = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data: pageData, error: pageError } = await supabase
          .from("satellites")
          .select("norad_cat_id, object_name, object_type, country_code, inclination, apoapsis, periapsis, period, launch_date, tle_line1, tle_line2")
          .neq("object_type", "DEBRIS")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError || !pageData || pageData.length === 0) break;
        allData = [...allData, ...pageData];
        if (pageData.length < pageSize) break;
        page++;
      }

      const data = allData;

      satsRef.current = data.map(s => ({ ...s, category: categorize(s) }));

      // Build a single Points geometry for all satellites
      const positions = [];
      const colors = [];
      const satObjects = [];

      const now = new Date();
      const gmst = satellite.gstime(now);

      data.forEach((sat) => {
        let x, y, z, lon;
        let usedTLE = false;

        // TLE-based positioning — propagate to current time
        if (sat.tle_line1 && sat.tle_line2) {
          try {
            const satrec = satellite.twoline2satrec(sat.tle_line1.trim(), sat.tle_line2.trim());
            const pv = satellite.propagate(satrec, now);
            if (pv?.position && !isNaN(pv.position.x)) {
              const geo = satellite.eciToGeodetic(pv.position, gmst);
              const latDeg = satellite.degreesLat(geo.latitude);
              const lonDeg = satellite.degreesLong(geo.longitude);
              [x, y, z] = latLonToXYZ(latDeg, lonDeg, geo.height);
              lon = (lonDeg * Math.PI) / 180;
              usedTLE = true;
            }
          } catch (e) { /* fall through */ }
        }

        // Fallback: random placement within orbital parameters
        if (x === undefined) {
          if (!sat.inclination || !sat.apoapsis) return;
          const inc = (sat.inclination * Math.PI) / 180;
          const alt = altToRadius(sat.apoapsis);
          lon = Math.random() * Math.PI * 2;
          const lat = (Math.random() - 0.5) * inc * 2;
          x = alt * Math.cos(lat) * Math.cos(lon);
          y = alt * Math.sin(lat);
          z = alt * Math.cos(lat) * Math.sin(lon);
        }

        // Orbital animation parameters (Keplerian ellipse)
        const inc0 = sat.inclination ? (sat.inclination * Math.PI) / 180 : 0;
        const sinI = Math.sin(inc0), cosI = Math.cos(inc0);
        const sinR = Math.sin(lon),  cosR = Math.cos(lon);
        const rApo  = altToRadius(sat.apoapsis  ?? 400);
        const rPeri = altToRadius(sat.periapsis ?? sat.apoapsis ?? 400);
        const a = (rApo + rPeri) / 2;
        const c = (rApo - rPeri) / 2;
        const b = Math.sqrt(Math.max(0, a * a - c * c));
        // Derive initial theta from current position (inverse of orbit-trace math)
        const xOrb = x * cosR + z * sinR;
        const zeq  = -x * sinR + z * cosR;
        const zOrb = Math.abs(sinI) > 0.1 ? y / sinI : zeq / (cosI || 1);
        const theta = Math.atan2(zOrb / (b || 1), (xOrb + c) / (a || 1));
        // Only animate sats whose position came from TLE propagation
        const angularSpeed = (usedTLE && sat.period > 0)
          ? (2 * Math.PI) / (sat.period * 60 * 1000)
          : 0;

        const cat = categorize(sat);
        const hex = CATEGORIES.find(c => c.id === cat)?.color || "#ffffff";
        const color = new THREE.Color(hex);

        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
        satObjects.push({ ...sat, category: cat, lon, x, y, z, theta, angularSpeed, a, b, c, sinI, cosI, sinR, cosR });
      });

      const geo = new THREE.BufferGeometry();
      const posAttr = new THREE.Float32BufferAttribute(positions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("position", posAttr);
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.008,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        depthTest: true,
      });

      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      points.renderOrder = 1;
      earth.add(points);
      pointsRef.current = { geo, mat, satObjects, colors: [...colors], points };

      setVisibleCount(satsRef.current.length);
      setLoading(false);
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

    return () => {
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
      issTrailGeo.dispose();
      issTrailMesh.material.dispose();
      issFutureGeo.dispose();
      issFutureMesh.material.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update dot visibility and orbit shells when filters change
  useEffect(() => {
    const { geo, satObjects } = pointsRef.current;
    if (!geo || !satObjects) return;

    // Returns filterable country codes for a category (excludes name/type sentinels)
    const getFilterableCodes = (catId) => {
      if (catId === "rest_of_world") {
        return [...new Set(satObjects.filter(s => s.category === "rest_of_world" && s.country_code).map(s => s.country_code))];
      }
      return (CATEGORY_CODES[catId] || []).filter(c => !c.startsWith("Name:") && !c.startsWith("Type:") && c !== "All other codes");
    };

    // Per-category: if any selected codes belong to this cat, filter to those; else show all in cat
    const satVisible = (sat) => {
      const inCat = active.length === 0 || active.includes(sat.category);
      if (!inCat) return false;
      const catCodes = getFilterableCodes(sat.category);
      const selectedInCat = selectedCodes.filter(c => catCodes.includes(c));
      return selectedInCat.length === 0 || selectedInCat.includes(sat.country_code);
    };

    // Update dot colors
    const newColors = [];
    satObjects.forEach((sat) => {
      if (satVisible(sat)) {
        const hex = CATEGORIES.find(c => c.id === sat.category)?.color || "#ffffff";
        const color = new THREE.Color(hex);
        newColors.push(color.r, color.g, color.b);
      } else {
        newColors.push(0.05, 0.05, 0.1);
      }
    });
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

    if (active.length === 0 || !earth) return;

    const MAX_ORBITS = 300;
    const N = 72; // points per orbit

    active.forEach(catId => {
      const selectedInCat = selectedCodes.filter(c => getFilterableCodes(catId).includes(c));
      const catSats = satObjects.filter(s =>
        s.category === catId &&
        s.apoapsis != null &&
        s.inclination != null &&
        (selectedInCat.length === 0 || selectedInCat.includes(s.country_code))
      );
      if (catSats.length === 0) return;

      const catColor = new THREE.Color(CATEGORIES.find(c => c.id === catId)?.color || "#ffffff");

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
  }, [active, selectedCodes]);

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
    <div style={{ background: "#020818", width: "100%", height: "100%", overflow: "hidden", position: "relative", fontFamily: "'Courier New', monospace" }}>
      {/* Loading overlay */}
      {showOverlay && (
        <>
          <style>{`
            @keyframes orbit-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes pulse-ring {
              0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.6; }
              100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
            }
            @keyframes dot-blink {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.2; }
            }
          `}</style>
          <div style={{ position: "fixed", inset: 0, background: "#020818", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", opacity: overlayFading ? 0 : 1, transition: "opacity 0.9s ease", pointerEvents: overlayFading ? "none" : "all" }}>
            <div style={{ color: "#00d4ff", fontSize: 32, fontWeight: "bold", letterSpacing: 8, marginBottom: 8 }}>ORBIT ATLAS</div>
            <div style={{ color: "#00ff8866", fontSize: 12, letterSpacing: 3, marginBottom: 64 }}>SPACE OBJECT TRACKING SYSTEM</div>

            {/* Animated rings */}
            <div style={{ position: "relative", width: 90, height: 90, marginBottom: 48 }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 44, height: 44, borderRadius: "50%", border: "1px solid #00d4ff55", animation: "pulse-ring 2s ease-out infinite" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 44, height: 44, borderRadius: "50%", border: "1px solid #00d4ff55", animation: "pulse-ring 2s ease-out infinite 0.75s" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 66, height: 66, marginTop: -33, marginLeft: -33, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#00d4ff", borderRightColor: "#00d4ff44", animation: "orbit-spin 1.1s linear infinite" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, marginTop: -5, marginLeft: -5, borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 14px #00d4ff", animation: "dot-blink 1.5s ease-in-out infinite" }} />
            </div>

            <div style={{ color: "#00d4ff", fontSize: 13, letterSpacing: 3, marginBottom: 10 }}>LOADING OBJECTS...</div>
            <div style={{ color: "#00d4ff44", fontSize: 11, letterSpacing: 2 }}>FETCHING SATELLITE DATA</div>
          </div>
        </>
      )}

      {/* Globe */}
      <div ref={mountRef} style={{ position: "absolute", inset: 0, touchAction: "none" }} />

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: isMobile ? "12px 16px" : "20px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #00d4ff22", background: "linear-gradient(180deg, #020818 0%, transparent 100%)" }}>
        <div>
          <div style={{ color: "#00d4ff", fontSize: isMobile ? 16 : 22, fontWeight: "bold", letterSpacing: isMobile ? 2 : 4 }}>ORBIT ATLAS</div>
          {!isMobile && <div style={{ color: "#00ff8888", fontSize: 11, letterSpacing: 2 }}>SPACE OBJECT TRACKING SYSTEM</div>}
        </div>
        <div style={{ color: "#00d4ff88", fontSize: isMobile ? 10 : 12, letterSpacing: 2 }}>
          {loading ? "LOADING..." : `${visibleCount.toLocaleString()} OBJECTS`}
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      {!isMobile && (
        <>
          {/* Left Column — filter + key */}
          <div style={{ position: "absolute", top: "50%", left: 20, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 10, width: 220 }}>
            {/* Filter Sidebar */}
            <div style={{ background: "#020818cc", border: "1px solid #00d4ff33", borderRadius: 8, padding: "20px 16px", backdropFilter: "blur(10px)", minWidth: 200 }}>
              <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>FILTER OBJECTS</div>
              {CATEGORIES.map(cat => (
                <div key={cat.id} onClick={() => toggleCategory(cat.id)} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, cursor: "pointer", opacity: active.length === 0 || active.includes(cat.id) ? 1 : 0.4, transition: "opacity 0.2s" }}>
                  <div style={{ width: 36, height: 18, borderRadius: 9, background: active.includes(cat.id) ? cat.color : "#1a1a2e", border: `1px solid ${cat.color}`, transition: "background 0.2s", position: "relative" }}>
                    <div style={{ position: "absolute", top: 2, left: active.includes(cat.id) ? 18 : 2, width: 12, height: 12, borderRadius: "50%", background: active.includes(cat.id) ? "#020818" : cat.color, transition: "left 0.2s" }} />
                  </div>
                  <div style={{ color: cat.color, fontSize: 12, letterSpacing: 1 }}>{cat.label}</div>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #00d4ff22", marginTop: 8, paddingTop: 12 }}>
                <div onClick={() => { setActive([]); setSelectedCodes([]); }} style={{ color: "#00d4ff88", fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center" }}>RESET FILTERS</div>
              </div>
            </div>
            {/* Country Code Key */}
            <div style={{ background: "#020818cc", border: "1px solid #00d4ff33", borderRadius: 8, padding: "16px", backdropFilter: "blur(10px)" }}>
              <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 12 }}>COUNTRY CODES</div>
              {active.map(catId => {
                const cat = CATEGORIES.find(c => c.id === catId);
                const codes = catId === "rest_of_world"
                  ? [...new Set(satsRef.current.filter(s => s.category === "rest_of_world" && s.country_code).map(s => s.country_code))].sort()
                  : (CATEGORY_CODES[catId] || []);
                if (!cat) return null;
                return (
                  <div key={catId} style={{ marginBottom: 12 }}>
                    <div style={{ color: cat.color, fontSize: 10, letterSpacing: 1, marginBottom: 5 }}>{cat.label.toUpperCase()}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {codes.map(code => {
                        const isSelected = selectedCodes.includes(code);
                        const isDimmed = codes.filter(c => selectedCodes.includes(c)).length > 0 && !isSelected;
                        return (
                          <span key={code} onClick={() => setSelectedCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])}
                            style={{ background: isSelected ? `${cat.color}44` : `${cat.color}18`, border: `1px solid ${isSelected ? cat.color : `${cat.color}44`}`, borderRadius: 3, color: isSelected ? cat.color : `${cat.color}cc`, fontSize: 9, padding: "2px 5px", letterSpacing: 1, cursor: "pointer", opacity: isDimmed ? 0.35 : 1, transition: "opacity 0.15s, background 0.15s" }}>
                            {code}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {selectedCodes.length > 0 && (
                <div style={{ borderTop: "1px solid #00d4ff22", marginTop: 8, paddingTop: 10 }}>
                  <div onClick={() => setSelectedCodes([])} style={{ color: "#00d4ff88", fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center" }}>RESET CODE FILTER</div>
                </div>
              )}
            </div>
          </div>

          {/* Selected satellite panel */}
          {selected && (
            <div style={{ position: "absolute", top: "50%", right: 20, transform: "translateY(-50%)", background: "#020818cc", border: "1px solid #00d4ff33", borderRadius: 8, padding: 24, backdropFilter: "blur(10px)", minWidth: 260, maxWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3 }}>OBJECT DATA</div>
                <div onClick={() => setSelected(null)} style={{ color: "#00d4ff88", cursor: "pointer", fontSize: 18 }}>×</div>
              </div>
              {[
                ["NAME", selected.object_name], ["TYPE", selected.object_type], ["COUNTRY", selected.country_code],
                ["LAUNCHED", selected.launch_date], ["INCLINATION", selected.inclination ? `${selected.inclination}°` : "N/A"],
                ["APOAPSIS", selected.apoapsis ? `${Math.round(selected.apoapsis)} km` : "N/A"],
                ["PERIAPSIS", selected.periapsis ? `${Math.round(selected.periapsis)} km` : "N/A"],
                ["PERIOD", selected.period ? `${Math.round(selected.period)} min` : "N/A"],
              ].map(([label, value]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ color: "#00d4ff88", fontSize: 10, letterSpacing: 2 }}>{label}</div>
                  <div style={{ color: "#ffffff", fontSize: 13, marginTop: 2 }}>{value || "N/A"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Speed Control */}
          <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#020818cc", border: "1px solid #00d4ff33", borderRadius: 8, padding: "12px 20px", backdropFilter: "blur(10px)", textAlign: "center", minWidth: 260 }}>
            <div style={{ color: "#00d4ff", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>SIMULATION SPEED</div>
            <input type="range" min="0" max="3600" step="10" value={timeScale}
              onChange={e => { const v = Number(e.target.value); setTimeScale(v); timeScaleRef.current = v; }}
              style={{ width: "100%", accentColor: "#00d4ff", cursor: "pointer", marginBottom: 8 }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
              {[["PAUSE", 0], ["1×", 1], ["60×", 60], ["600×", 600], ["3600×", 3600]].map(([label, val]) => (
                <div key={val} onClick={() => { setTimeScale(val); timeScaleRef.current = val; }}
                  style={{ background: timeScale === val ? "#00d4ff33" : "transparent", border: `1px solid ${timeScale === val ? "#00d4ff" : "#00d4ff44"}`, borderRadius: 4, color: timeScale === val ? "#00d4ff" : "#00d4ff88", fontSize: 10, padding: "3px 8px", letterSpacing: 1, cursor: "pointer" }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ color: "#00d4ff", fontSize: 12, letterSpacing: 2 }}>
              {timeScale === 0 ? "PAUSED" : timeScale === 1 ? "REAL TIME" : `${timeScale}×`}
            </div>
          </div>

          {/* ISS Tracker Panel */}
          <div style={{ position: "absolute", bottom: 24, right: 24, background: "#020818dd", border: "1px solid #FFD70044", borderRadius: 8, padding: "18px 22px", backdropFilter: "blur(10px)", minWidth: 230 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFD700", boxShadow: "0 0 8px #FFD700" }} />
              <div style={{ color: "#FFD700", fontSize: 11, fontWeight: "bold", letterSpacing: 3 }}>ISS TRACKER</div>
            </div>
            <div style={{ color: "#FFD70055", fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>INTERNATIONAL SPACE STATION</div>
            {issData ? (
              <>
                {[
                  ["ALTITUDE",  `${Number(issData.altitude).toFixed(1)} km`],
                  ["VELOCITY",  `${Number(issData.velocity).toFixed(2)} km/s`],
                  ["LATITUDE",  `${Number(issData.latitude).toFixed(4)}°`],
                  ["LONGITUDE", `${Number(issData.longitude).toFixed(4)}°`],
                  ["STATUS",    issData.visibility === "daylight" ? "DAYLIGHT" : "ECLIPSE"],
                ].map(([label, value]) => (
                  <div key={label} style={{ marginBottom: 9 }}>
                    <div style={{ color: "#FFD70066", fontSize: 10, letterSpacing: 2 }}>{label}</div>
                    <div style={{ color: "#FFD700", fontSize: 13, marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ color: "#FFD70066", fontSize: 11, letterSpacing: 1 }}>ACQUIRING SIGNAL...</div>
            )}
          </div>
        </>
      )}

      {/* ── MOBILE LAYOUT ── */}
      {isMobile && (
        <>
          {/* Bottom sheet — slides up when a tab is open */}
          {mobileTab && (
            <div style={{ position: "fixed", bottom: 64, left: 0, right: 0, background: "#020818f0", borderTop: "1px solid #00d4ff33", borderRadius: "14px 14px 0 0", padding: "18px 20px 12px", maxHeight: "58vh", overflowY: "auto", backdropFilter: "blur(16px)", zIndex: 500 }}>

              {mobileTab === "filter" && (
                <>
                  <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>FILTER OBJECTS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 16 }}>
                    {CATEGORIES.map(cat => (
                      <div key={cat.id} onClick={() => toggleCategory(cat.id)}
                        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", opacity: active.length === 0 || active.includes(cat.id) ? 1 : 0.4, padding: "6px 0" }}>
                        <div style={{ width: 34, height: 18, borderRadius: 9, background: active.includes(cat.id) ? cat.color : "#1a1a2e", border: `1px solid ${cat.color}`, flexShrink: 0, position: "relative" }}>
                          <div style={{ position: "absolute", top: 2, left: active.includes(cat.id) ? 16 : 2, width: 12, height: 12, borderRadius: "50%", background: active.includes(cat.id) ? "#020818" : cat.color, transition: "left 0.2s" }} />
                        </div>
                        <div style={{ color: cat.color, fontSize: 11, letterSpacing: 0.5 }}>{cat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div onClick={() => { setActive([]); setSelectedCodes([]); }} style={{ color: "#00d4ff88", fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center", padding: "10px 0", borderTop: "1px solid #00d4ff22" }}>RESET ALL FILTERS</div>
                </>
              )}

              {mobileTab === "codes" && (
                <>
                  <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 12 }}>COUNTRY CODES</div>
                  {active.length === 0 && <div style={{ color: "#00d4ff44", fontSize: 11, letterSpacing: 1 }}>Enable a filter category to see its country codes.</div>}
                  {active.map(catId => {
                    const cat = CATEGORIES.find(c => c.id === catId);
                    const codes = catId === "rest_of_world"
                      ? [...new Set(satsRef.current.filter(s => s.category === "rest_of_world" && s.country_code).map(s => s.country_code))].sort()
                      : (CATEGORY_CODES[catId] || []);
                    if (!cat) return null;
                    return (
                      <div key={catId} style={{ marginBottom: 14 }}>
                        <div style={{ color: cat.color, fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>{cat.label.toUpperCase()}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {codes.map(code => {
                            const isSelected = selectedCodes.includes(code);
                            const isDimmed = codes.filter(c => selectedCodes.includes(c)).length > 0 && !isSelected;
                            return (
                              <span key={code} onClick={() => setSelectedCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])}
                                style={{ background: isSelected ? `${cat.color}44` : `${cat.color}18`, border: `1px solid ${isSelected ? cat.color : `${cat.color}44`}`, borderRadius: 4, color: isSelected ? cat.color : `${cat.color}cc`, fontSize: 11, padding: "4px 8px", letterSpacing: 1, cursor: "pointer", opacity: isDimmed ? 0.35 : 1 }}>
                                {code}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {selectedCodes.length > 0 && (
                    <div onClick={() => setSelectedCodes([])} style={{ color: "#00d4ff88", fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center", padding: "10px 0", borderTop: "1px solid #00d4ff22", marginTop: 4 }}>RESET CODE FILTER</div>
                  )}
                </>
              )}

              {mobileTab === "object" && (
                <>
                  <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 14 }}>OBJECT DATA</div>
                  {selected ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                        {[
                          ["NAME", selected.object_name], ["TYPE", selected.object_type],
                          ["COUNTRY", selected.country_code], ["LAUNCHED", selected.launch_date],
                          ["INCLINATION", selected.inclination ? `${selected.inclination}°` : "N/A"],
                          ["APOAPSIS", selected.apoapsis ? `${Math.round(selected.apoapsis)} km` : "N/A"],
                          ["PERIAPSIS", selected.periapsis ? `${Math.round(selected.periapsis)} km` : "N/A"],
                          ["PERIOD", selected.period ? `${Math.round(selected.period)} min` : "N/A"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div style={{ color: "#00d4ff88", fontSize: 10, letterSpacing: 2 }}>{label}</div>
                            <div style={{ color: "#ffffff", fontSize: 13, marginTop: 2 }}>{value || "N/A"}</div>
                          </div>
                        ))}
                      </div>
                      <div onClick={() => setSelected(null)} style={{ color: "#00d4ff88", fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center", padding: "10px 0", borderTop: "1px solid #00d4ff22", marginTop: 14 }}>DESELECT</div>
                    </>
                  ) : (
                    <div style={{ color: "#00d4ff44", fontSize: 11, letterSpacing: 1 }}>Tap a satellite on the globe to select it.</div>
                  )}
                </>
              )}

              {mobileTab === "iss" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFD700", boxShadow: "0 0 8px #FFD700" }} />
                    <div style={{ color: "#FFD700", fontSize: 11, fontWeight: "bold", letterSpacing: 3 }}>ISS TRACKER</div>
                  </div>
                  <div style={{ color: "#FFD70055", fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>INTERNATIONAL SPACE STATION</div>
                  {issData ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                      {[
                        ["ALTITUDE",  `${Number(issData.altitude).toFixed(1)} km`],
                        ["VELOCITY",  `${Number(issData.velocity).toFixed(2)} km/s`],
                        ["LATITUDE",  `${Number(issData.latitude).toFixed(4)}°`],
                        ["LONGITUDE", `${Number(issData.longitude).toFixed(4)}°`],
                        ["STATUS",    issData.visibility === "daylight" ? "DAYLIGHT" : "ECLIPSE"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ color: "#FFD70066", fontSize: 10, letterSpacing: 2 }}>{label}</div>
                          <div style={{ color: "#FFD700", fontSize: 13, marginTop: 2 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#FFD70066", fontSize: 11 }}>ACQUIRING SIGNAL...</div>
                  )}
                </>
              )}

              {mobileTab === "speed" && (
                <>
                  <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>SIMULATION SPEED</div>
                  <input type="range" min="0" max="3600" step="10" value={timeScale}
                    onChange={e => { const v = Number(e.target.value); setTimeScale(v); timeScaleRef.current = v; }}
                    style={{ width: "100%", accentColor: "#00d4ff", cursor: "pointer", marginBottom: 16 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 12 }}>
                    {[["PAUSE", 0], ["1×", 1], ["60×", 60], ["600×", 600], ["3600×", 3600]].map(([label, val]) => (
                      <div key={val} onClick={() => { setTimeScale(val); timeScaleRef.current = val; }}
                        style={{ flex: 1, textAlign: "center", background: timeScale === val ? "#00d4ff33" : "transparent", border: `1px solid ${timeScale === val ? "#00d4ff" : "#00d4ff44"}`, borderRadius: 6, color: timeScale === val ? "#00d4ff" : "#00d4ff88", fontSize: 12, padding: "8px 4px", letterSpacing: 1, cursor: "pointer" }}>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div style={{ color: "#00d4ff", fontSize: 13, letterSpacing: 2, textAlign: "center" }}>
                    {timeScale === 0 ? "PAUSED" : timeScale === 1 ? "REAL TIME" : `${timeScale}×`}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bottom tab bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "#020818", borderTop: "1px solid #00d4ff22", display: "flex", zIndex: 600 }}>
            {[
              { id: "filter", label: "FILTER",  icon: "≡",  color: "#00d4ff", badge: active.length > 0 },
              { id: "codes",  label: "CODES",   icon: "⊞",  color: "#00d4ff", badge: selectedCodes.length > 0 },
              { id: "object", label: "OBJECT",  icon: "◎",  color: "#00d4ff", badge: !!selected },
              { id: "iss",    label: "ISS",     icon: "◉",  color: "#FFD700", badge: !!issData },
              { id: "speed",  label: "SPEED",   icon: "⏱",  color: "#00d4ff", badge: timeScale !== 60 },
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
