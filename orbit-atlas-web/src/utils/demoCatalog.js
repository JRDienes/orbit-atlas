// ── Demo catalog ─────────────────────────────────────────────────────────
// Synthetic satellite rows used when no Supabase credentials are configured
// (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY missing from .env). The
// shapes match the real `satellites` table columns, and the constellations
// are modeled on real orbital regimes so the globe reads correctly: Starlink
// shells, Kuiper, GPS/GLONASS/Galileo MEO, the GEO belt, Molniya orbits,
// sun-synchronous LEO, and the ISS. Purely for local development/preview.

// Kepler's third law → period in minutes from apoapsis/periapsis altitudes (km)
function periodMin(apo, peri) {
  const a = 6371 + (apo + peri) / 2;
  return (2 * Math.PI * Math.sqrt((a * a * a) / 398600.4)) / 60;
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function randDate(yLo, yHi) {
  const y = (rand(yLo, yHi + 1)) | 0;
  const m = String(((rand(1, 13)) | 0)).padStart(2, "0");
  const d = String(((rand(1, 29)) | 0)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateDemoCatalog() {
  const rows = [];
  let norad = 40000;
  const add = (row) => rows.push({ norad_cat_id: norad++, object_type: "PAYLOAD", ...row });

  // ISS — fixed real NORAD id so the tracker and auto-scan weighting find it
  rows.push({ norad_cat_id: 25544, object_name: "ISS (ZARYA)", object_type: "PAYLOAD", country_code: "ISS", launch_date: "1998-11-20", inclination: 51.6, apoapsis: 422, periapsis: 413, period: periodMin(422, 413) });

  // Starlink shells (Gen1 ~53°/550km, Gen2 V2-mini higher numbering)
  for (let i = 0; i < 2600; i++) {
    const gen2 = i > 1500;
    const n = gen2 ? 30000 + i : 1000 + i;
    const apo = rand(535, 575);
    add({ object_name: `STARLINK-${n}`, country_code: "US", launch_date: randDate(gen2 ? 2023 : 2019, 2026), inclination: pick([53, 53.2, 70, 97.6]), apoapsis: apo, periapsis: apo - rand(2, 12), period: periodMin(apo, apo - 8) });
  }

  // Kuiper (~630km, 51.9°)
  for (let i = 0; i < 450; i++) {
    const apo = rand(590, 635);
    add({ object_name: `KUIPER-${1100 + i}`, country_code: "US", launch_date: randDate(2024, 2026), inclination: 51.9, apoapsis: apo, periapsis: apo - rand(2, 10), period: periodMin(apo, apo - 6) });
  }

  // AST SpaceMobile BlueBirds
  for (let i = 0; i < 22; i++) {
    const apo = rand(690, 740);
    add({ object_name: `BLUEBIRD-${i + 1}`, country_code: "US", launch_date: randDate(2024, 2026), inclination: 53, apoapsis: apo, periapsis: apo - rand(2, 8), period: periodMin(apo, apo - 5) });
  }

  // GNSS MEO: GPS, GLONASS, Galileo, BeiDou
  for (let i = 0; i < 31; i++) add({ object_name: `NAVSTAR ${50 + i} (USA ${230 + i})`, country_code: "US", launch_date: randDate(1997, 2024), inclination: 55, apoapsis: 20200, periapsis: 20150, period: periodMin(20200, 20150) });
  for (let i = 0; i < 24; i++) add({ object_name: `COSMOS ${2500 + i} (GLONASS)`, country_code: "CIS", launch_date: randDate(2005, 2024), inclination: 64.8, apoapsis: 19140, periapsis: 19090, period: periodMin(19140, 19090) });
  for (let i = 0; i < 28; i++) add({ object_name: `GSAT0${200 + i} (GALILEO)`, country_code: "ESA", launch_date: randDate(2011, 2025), inclination: 56, apoapsis: 23230, periapsis: 23210, period: periodMin(23230, 23210) });
  for (let i = 0; i < 35; i++) add({ object_name: `BEIDOU-3 M${i + 1}`, country_code: "PRC", launch_date: randDate(2015, 2025), inclination: pick([55, 55, 0.5]), apoapsis: pick([21530, 35790]), periapsis: pick([21500, 35770]), period: periodMin(21530, 21500) });

  // GEO belt — comms birds from many operators, near-zero inclination
  const geoOps = [
    ["INTELSAT", "GLOB"], ["SES-", "SES"], ["EUTELSAT", "EUTE"], ["ASTRA", "LUXE"],
    ["YAMAL", "CIS"], ["EKSPRESS AM", "CIS"], ["CHINASAT", "PRC"], ["APSTAR", "PRC"],
    ["JCSAT", "JPN"], ["GSAT-", "IND"], ["INSAT-", "IND"], ["ARABSAT", "AB"],
    ["TURKSAT", "TURK"], ["KOREASAT", "SKOR"], ["TELKOM-", "INDO"], ["THAICOM", "THAI"],
    ["NILESAT", "EGYP"], ["AMAZONAS", "SPN"], ["ANIK F", "CA"], ["OPTUS", "AUS"],
    ["YAHSAT", "UAE"], ["BADR-", "SAUD"],
  ];
  for (let i = 0; i < 420; i++) {
    const [name, cc] = pick(geoOps);
    add({ object_name: `${name}${(rand(1, 30) | 0)}`, country_code: cc, launch_date: randDate(1995, 2025), inclination: rand(0.02, 3.5), apoapsis: 35795, periapsis: 35775, period: periodMin(35795, 35775) });
  }

  // Molniya — highly eccentric, 63.4° (the "unusual orbit" eye candy)
  for (let i = 0; i < 18; i++) add({ object_name: `MOLNIYA 3-${50 + i}`, country_code: "CIS", launch_date: randDate(1980, 2010), inclination: 63.4, apoapsis: rand(38500, 39900), periapsis: rand(450, 650), period: periodMin(39200, 550) });

  // Sun-synchronous LEO — earth observation from many countries
  const ssoOps = [["SENTINEL-", "ESA"], ["LANDSAT ", "US"], ["GAOFEN-", "PRC"], ["CARTOSAT-", "IND"], ["ALOS-", "JPN"], ["KOMPSAT-", "SKOR"], ["PLEIADES ", "FR"], ["ICEYE-", "FIN"], ["FLOCK 4", "US"], ["SKYSAT-", "US"], ["RESURS-P", "CIS"], ["RASAT", "TURK"], ["VNREDSAT", "RP"], ["FORMOSAT-", "TWN"], ["LAPAN-A", "INDO"], ["NEXTSAT-", "SKOR"], ["AMAZONIA-", "ROW"]];
  for (let i = 0; i < 900; i++) {
    const [name, cc] = pick(ssoOps);
    const apo = rand(480, 820);
    add({ object_name: `${name}${(rand(1, 60) | 0)}`, country_code: cc === "ROW" ? pick(["ARGN", "BRAZ", "CHLE", "SAFR", "MEX", "EGYP"]) : cc, launch_date: randDate(2008, 2026), inclination: rand(97, 99), apoapsis: apo, periapsis: apo - rand(5, 40), period: periodMin(apo, apo - 20) });
  }

  // Generic LEO smallsats / cubesats, mixed inclinations + countries
  for (let i = 0; i < 700; i++) {
    const apo = rand(400, 1200);
    add({ object_name: `OBJECT ${String.fromCharCode(65 + (i % 26))}${1000 + i}`, country_code: pick(["US", "UK", "GER", "FR", "IT", "JPN", "IND", "PRC", "CIS", "SKOR", "SING", "UAE", "BRAZ", "NETH", "SWED", "INDO", "MALA", "THAI", "TWN"]), launch_date: randDate(2012, 2026), inclination: pick([rand(40, 60), rand(85, 99)]), apoapsis: apo, periapsis: apo - rand(5, 60), period: periodMin(apo, apo - 30) });
  }

  // Asia-Pacific LEO/SSO batch — without this the region read as GEO-only
  // (one equatorial band), which misrepresents real catalogs: KOMPSAT,
  // FORMOSAT, LAPAN etc. fly steep sun-sync orbits. Includes a couple of
  // near-equatorial LEO oddballs (RazakSAT-style) for flavor.
  const apacOps = [["KOMPSAT-", "SKOR"], ["FORMOSAT-", "TWN"], ["LAPAN-A", "INDO"], ["RAZAKSAT-", "MALA"], ["THEOS-", "THAI"], ["DIWATA-", "RP"], ["ONNESHA-", "BGD"], ["VELOX-", "SING"]];
  for (let i = 0; i < 120; i++) {
    const [name, cc] = apacOps[i % apacOps.length];
    const nearEq = Math.random() < 0.08; // RazakSAT-style near-equatorial LEO
    const apo = rand(450, 900);
    add({
      object_name: `${name}${(rand(1, 9) | 0)}`,
      country_code: cc,
      launch_date: randDate(2009, 2026),
      inclination: nearEq ? rand(6, 12) : rand(96.5, 98.8),
      apoapsis: apo, periapsis: apo - rand(5, 35), period: periodMin(apo, apo - 20),
    });
  }

  // Rocket bodies — spent upper stages scattered through LEO/GTO
  for (let i = 0; i < 350; i++) {
    const gto = Math.random() < 0.3;
    const apo = gto ? rand(30000, 36500) : rand(500, 1500);
    const peri = gto ? rand(180, 600) : apo - rand(20, 200);
    add({ object_name: pick(["FALCON 9 R/B", "CZ-3B R/B", "ARIANE 5 R/B", "PROTON-M R/B", "H-2A R/B", "PSLV R/B"]), object_type: "ROCKET BODY", country_code: pick(["US", "PRC", "FR", "CIS", "JPN", "IND"]), launch_date: randDate(1990, 2026), inclination: rand(0, 99), apoapsis: apo, periapsis: peri, period: periodMin(apo, peri) });
  }

  return rows;
}
