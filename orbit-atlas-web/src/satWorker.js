/* eslint-disable no-restricted-globals */

// Duplicated from App.js — workers are isolated bundles with no shared scope
const CATEGORIES = [
  { id: "starlink",        color: "#00D4FF" },
  { id: "kuiper",          color: "#FF9900" },
  { id: "ast_spacemobile", color: "#CC44FF" },
  { id: "us",              color: "#4488FF" },
  { id: "uk",              color: "#FF2244" },
  { id: "europe",          color: "#FFEE00" },
  { id: "russia",          color: "#FF3333" },
  { id: "china",           color: "#DD0000" },
  { id: "japan",           color: "#FF66AA" },
  { id: "india",           color: "#FF7700" },
  { id: "middle_east",     color: "#FFB700" },
  { id: "asia_pacific",    color: "#00DDAA" },
  { id: "rest_of_world",   color: "#AAAAAA" },
  { id: "debris",          color: "#FF5500" },
  { id: "rocket_body",     color: "#778899" },
];

// Starlink generation from the numeric suffix in "STARLINK-N", returned as the
// chip code used for sub-filtering (like a country code). Keep the thresholds in
// sync with STARLINK_GEN2_MIN / STARLINK_GEN3_MIN in utils/constants.js.
// Gen 3 (V3, Starship) has not launched; set GEN3_MIN to its starting number when known.
const STARLINK_GEN2_MIN = 30000;
const STARLINK_GEN3_MIN = Infinity;

function starlinkGen(name) {
  const m = name.match(/STARLINK-(\d+)/);
  const n = m ? parseInt(m[1], 10) : NaN;
  if (n >= STARLINK_GEN3_MIN) return "V3";
  if (n >= STARLINK_GEN2_MIN) return "V2";
  return "V1"; // older numbering + any unparseable names
}

function categorize(sat) {
  const name = sat.object_name?.toUpperCase() || "";
  const country = sat.country_code || "";
  const type = sat.object_type?.toUpperCase() || "";
  if (name.includes("STARLINK")) return "starlink";
  if (name.includes("KUIPER")) return "kuiper";
  if (name.includes("BLUEBIRD") || name.includes("SPACEMOBILE")) return "ast_spacemobile";
  if (type === "DEBRIS") return "debris";
  if (type === "ROCKET BODY") return "rocket_body";
  if (["US","CA","AUS","NZ","GLOB","ORB","O3B","ITSO"].includes(country) ||
      name.includes("NROL") || name.includes("NAVSTAR") || name.includes("MILSTAR") ||
      name.includes("AEHF") || name.includes("WGS") || name.includes("USA ")) return "us";
  if (["UK","IM"].includes(country)) return "uk";
  if (["FR","GER","IT","SPN","NOR","SWED","BEL","NETH","SWTZ","DEN",
       "FIN","POR","POL","CZE","CZCH","HUN","ROM","EST","LTU","HRV",
       "SVN","FGER","GREC","LUXE","TURK","ESA","EUME","EUTE","SES","FRIT"].includes(country)) return "europe";
  if (["CIS","RUS","SU","USSR","BELA","KAZ","UKR","AZER","SEAL","TMMC","STCT"].includes(country)) return "russia";
  if (["PRC","CHBZ","CHLE","NICO","ABS","PAKI","LAOS","NKOR"].includes(country)) return "china";
  if (country === "JPN") return "japan";
  if (country === "IND") return "india";
  if (["SAUD","UAE","QAT","KWT","BHR","JOR","IRAN","IRAQ","AB"].includes(country)) return "middle_east";
  if (["SKOR","INDO","MALA","THAI","SING","BGD","TWN","ASRA","RP"].includes(country)) return "asia_pacific";
  return "rest_of_world";
}

function altToRadius(altKm) {
  return 1.05 + Math.log(1 + Math.min(Math.max(200, altKm), 42000) / 6371);
}

// Workers have no DOM — parse hex color manually instead of using THREE.Color
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

self.onmessage = function ({ data: { sats } }) {
  const positions = [];
  const colors = [];
  const satObjects = [];

  sats.forEach(sat => {
    if (!sat.inclination || !sat.apoapsis) return;

    // Place the satellite directly on its orbit ellipse, using independent random
    // RAAN (plane orientation) and phase. This is the SAME transform the render
    // loop and orbit-ring drawing use, so dots sit on a uniform shell — no
    // back-solving, no latitude bias, no clumping toward one hemisphere.
    const inc  = (sat.inclination * Math.PI) / 180;
    const raan = Math.random() * Math.PI * 2; // ascending node longitude
    const theta = Math.random() * Math.PI * 2; // starting phase along the orbit
    const sinI = Math.sin(inc), cosI = Math.cos(inc);
    const sinR = Math.sin(raan), cosR = Math.cos(raan);
    const rApo  = altToRadius(sat.apoapsis);
    const rPeri = altToRadius(sat.periapsis ?? sat.apoapsis);
    const a = (rApo + rPeri) / 2;
    const c = (rApo - rPeri) / 2;
    const b = Math.sqrt(Math.max(0, a * a - c * c));
    const xOrb = a * Math.cos(theta) - c;
    const zOrb = b * Math.sin(theta);
    const x = xOrb * cosR - zOrb * cosI * sinR;
    const y = zOrb * sinI;
    const z = xOrb * sinR + zOrb * cosI * cosR;
    const lon = raan; // stored as RAAN so orbit rings match the dot positions
    // Orbital animation speed comes from the period column, independent of TLE.
    const angularSpeed = sat.period > 0 ? (2 * Math.PI) / (sat.period * 60 * 1000) : 0;

    const cat = categorize(sat);
    const [cr, cg, cb] = hexToRgb(CATEGORIES.find(c => c.id === cat)?.color || "#ffffff");

    // filterKey is the value the code-chips filter on within a category:
    // Starlink → generation (V1/V2/V3), everything else → country code.
    const filterKey = cat === "starlink"
      ? starlinkGen((sat.object_name || "").toUpperCase())
      : sat.country_code;

    positions.push(x, y, z);
    colors.push(cr, cg, cb);

    satObjects.push({
      norad_cat_id: sat.norad_cat_id,
      object_name:  sat.object_name,
      object_type:  sat.object_type,
      country_code: sat.country_code,
      launch_date:  sat.launch_date,
      inclination:  sat.inclination,
      apoapsis:     sat.apoapsis,
      periapsis:    sat.periapsis,
      period:       sat.period,
      category: cat, filterKey, lon, x, y, z, theta, angularSpeed, a, b, c, sinI, cosI, sinR, cosR,
    });
  });

  const posArr = new Float32Array(positions);
  const colArr = new Float32Array(colors);

  // Transfer ownership of the buffers instead of copying — zero-cost move
  self.postMessage({ posArr, colArr, satObjects }, [posArr.buffer, colArr.buffer]);
};
