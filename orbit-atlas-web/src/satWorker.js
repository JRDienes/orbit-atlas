/* eslint-disable no-restricted-globals */
import * as satellite from "satellite.js";

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
  if (["CIS","BELA","KAZ","UKR","AZER","SEAL","TMMC","STCT"].includes(country)) return "russia";
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

function latLonToXYZ(latDeg, lonDeg, altKm) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r = altToRadius(altKm);
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)];
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
  const now = new Date();
  const gmst = satellite.gstime(now);

  const positions = [];
  const colors = [];
  const satObjects = [];

  sats.forEach(sat => {
    let x, y, z, lon;
    let usedTLE = false;

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

    const inc0 = sat.inclination ? (sat.inclination * Math.PI) / 180 : 0;
    const sinI = Math.sin(inc0), cosI = Math.cos(inc0);
    const sinR = Math.sin(lon),  cosR = Math.cos(lon);
    const rApo  = altToRadius(sat.apoapsis  ?? 400);
    const rPeri = altToRadius(sat.periapsis ?? sat.apoapsis ?? 400);
    const a = (rApo + rPeri) / 2;
    const c = (rApo - rPeri) / 2;
    const b = Math.sqrt(Math.max(0, a * a - c * c));
    const xOrb = x * cosR + z * sinR;
    const zeq  = -x * sinR + z * cosR;
    const zOrb = Math.abs(sinI) > 0.1 ? y / sinI : zeq / (cosI || 1);
    const theta = Math.atan2(zOrb / (b || 1), (xOrb + c) / (a || 1));
    const angularSpeed = (usedTLE && sat.period > 0)
      ? (2 * Math.PI) / (sat.period * 60 * 1000)
      : 0;

    const cat = categorize(sat);
    const [cr, cg, cb] = hexToRgb(CATEGORIES.find(c => c.id === cat)?.color || "#ffffff");

    positions.push(x, y, z);
    colors.push(cr, cg, cb);

    // Omit tle_line1/tle_line2 — not needed after propagation
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
      category: cat, lon, x, y, z, theta, angularSpeed, a, b, c, sinI, cosI, sinR, cosR,
    });
  });

  const posArr = new Float32Array(positions);
  const colArr = new Float32Array(colors);

  // Transfer ownership of the buffers instead of copying — zero-cost move
  self.postMessage({ posArr, colArr, satObjects }, [posArr.buffer, colArr.buffer]);
};
