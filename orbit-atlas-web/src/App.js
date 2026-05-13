import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createClient } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/react";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export const CATEGORIES = [
  { id: "starlink", label: "SpaceX / Starlink", color: "#00d4ff" },
  { id: "military", label: "DOD / Military", color: "#00ff88" },
  { id: "russia", label: "Russia", color: "#ff4444" },
  { id: "china", label: "China", color: "#ffaa00" },
  { id: "europe", label: "Europe / ESA", color: "#aa88ff" },
  { id: "other", label: "Other", color: "#ffffff" },
];

function categorize(sat) {
  const name = sat.object_name?.toUpperCase() || "";
  const country = sat.country_code || "";

  // SpaceX / Starlink
  if (name.includes("STARLINK") || name.includes("STARSHIP")) return "starlink";

  // DOD / Military — US government/military satellites
  if (
    name.includes("USA ") ||
    name.includes("NROL") ||
    name.includes("NAVSTAR") ||
    name.includes("GPS") ||
    name.includes("AEHF") ||
    name.includes("WGS") ||
    name.includes("SBIRS") ||
    name.includes("DSP ") ||
    name.includes("MILSTAR") ||
    name.includes("MUOS")
  ) return "military";

  // Russia
  if (country === "CIS" || country === "RU") return "russia";

  // China
  if (country === "PRC") return "china";

  // Europe / ESA
  if (["UK", "ESA", "FR", "GER", "IT", "SPN", "EUTE", "SES", "IRID"].includes(country)) return "europe";

  // Everything else
  return "other";
}

export default function App() {
  const mountRef = useRef(null);
  const [active, setActive] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const satsRef = useRef([]);
  const pointsRef = useRef([]);
  const sceneRef = useRef(null);

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
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Earth globe
    const earthGeo = new THREE.SphereGeometry(0.98, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      "https://unpkg.com/three-globe/example/img/earth-dark.jpg"
    );
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: 0x00d4ff,
      shininess: 15,
      depthWrite: true,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
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

    // Stars background
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];
    for (let i = 0; i < 8000; i++) {
      starVerts.push((Math.random() - 0.5) * 500);
      starVerts.push((Math.random() - 0.5) * 500);
      starVerts.push((Math.random() - 0.5) * 500);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })));

    // Mouse drag to rotate
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const onMouseDown = e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = e => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      earth.rotation.y += dx * 0.005;
      earth.rotation.x += dy * 0.005;
      wire.rotation.y = earth.rotation.y;
      wire.rotation.x = earth.rotation.x;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    // Zoom
    const onWheel = e => { camera.position.z = Math.min(6, Math.max(1.5, camera.position.z + e.deltaY * 0.005)); };
    window.addEventListener("wheel", onWheel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (!isDragging) { earth.rotation.y += 0.0002; wire.rotation.y += 0.0002; }
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

      data.forEach((sat) => {
        if (!sat.inclination || !sat.apoapsis) return;

        const inc = (sat.inclination * Math.PI) / 180;
        const alt = 1.05 + Math.min((sat.apoapsis / 6371) * 0.3, 0.8);
        const lon = Math.random() * Math.PI * 2;
        const lat = (Math.random() - 0.5) * inc * 2;

        const x = alt * Math.cos(lat) * Math.cos(lon);
        const y = alt * Math.sin(lat);
        const z = alt * Math.cos(lat) * Math.sin(lon);

        const cat = categorize(sat);
        const hex = CATEGORIES.find(c => c.id === cat)?.color || "#ffffff";
        const color = new THREE.Color(hex);

        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
        satObjects.push({ ...sat, category: cat });
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
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
      pointsRef.current = { geo, mat, satObjects, colors: [...colors] };

      setVisibleCount(satsRef.current.length);
      setLoading(false);
    }

    loadSats();

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update dot visibility when filters change
  useEffect(() => {
  const { geo, satObjects, colors: originalColors } = pointsRef.current;
  if (!geo || !satObjects) return;

  const newColors = [];
  satObjects.forEach((sat) => {
    const isActive = active.length === 0 || active.includes(sat.category);
    if (isActive) {
      const hex = CATEGORIES.find(c => c.id === sat.category)?.color || "#ffffff";
      const color = new THREE.Color(hex);
      newColors.push(color.r, color.g, color.b);
    } else {
      newColors.push(0.05, 0.05, 0.1);
    }
  });

  geo.setAttribute("color", new THREE.Float32BufferAttribute(newColors, 3));
  geo.attributes.color.needsUpdate = true;

  const count = active.length === 0
    ? satObjects.length
    : satObjects.filter(s => active.includes(s.category)).length;
  setVisibleCount(count);
}, [active]);

  return (
    <div style={{ background: "#020818", width: "100vw", height: "100vh", overflow: "hidden", fontFamily: "'Courier New', monospace" }}>
      {/* Globe */}
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "20px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #00d4ff22", background: "linear-gradient(180deg, #020818 0%, transparent 100%)" }}>
        <div>
          <div style={{ color: "#00d4ff", fontSize: 22, fontWeight: "bold", letterSpacing: 4 }}>ORBIT ATLAS</div>
          <div style={{ color: "#00ff8888", fontSize: 11, letterSpacing: 2 }}>SPACE OBJECT TRACKING SYSTEM</div>
        </div>
        <div style={{ color: "#00d4ff88", fontSize: 12, letterSpacing: 2 }}>
          {loading ? "LOADING OBJECTS..." : `${visibleCount.toLocaleString()} OBJECTS TRACKED`}
        </div>
      </div>

      {/* Left Sidebar */}
      <div style={{ position: "absolute", top: "50%", left: 20, transform: "translateY(-50%)", background: "#020818cc", border: "1px solid #00d4ff33", borderRadius: 8, padding: "20px 16px", backdropFilter: "blur(10px)", minWidth: 200 }}>
        <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>FILTER OBJECTS</div>
        {CATEGORIES.map(cat => (
          <div
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, cursor: "pointer", opacity: active.length === 0 || active.includes(cat.id) ? 1 : 0.4, transition: "opacity 0.2s" }}
          >
            {/* Toggle switch */}
            <div style={{ width: 36, height: 18, borderRadius: 9, background: active.includes(cat.id) ? cat.color : "#1a1a2e", border: `1px solid ${cat.color}`, transition: "background 0.2s", position: "relative" }}>
              <div style={{ position: "absolute", top: 2, left: active.includes(cat.id) ? 18 : 2, width: 12, height: 12, borderRadius: "50%", background: active.includes(cat.id) ? "#020818" : cat.color, transition: "left 0.2s" }} />
            </div>
            <div style={{ color: cat.color, fontSize: 12, letterSpacing: 1 }}>{cat.label}</div>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #00d4ff22", marginTop: 8, paddingTop: 12 }}>
          <div onClick={() => setActive([])} style={{ color: "#00d4ff88", fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center" }}>RESET FILTERS</div>
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
            ["NAME", selected.object_name],
            ["TYPE", selected.object_type],
            ["COUNTRY", selected.country_code],
            ["LAUNCHED", selected.launch_date],
            ["INCLINATION", selected.inclination ? `${selected.inclination}°` : "N/A"],
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
      <Analytics />
    </div>
  );
}
