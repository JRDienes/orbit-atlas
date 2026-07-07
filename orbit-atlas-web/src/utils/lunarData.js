// ── Lunar surface + orbit data ───────────────────────────────────────────
// Landing sites (selenographic lat/lon, degrees, east-positive) and active
// lunar orbiters for the MOON scope. Same shape conventions as Earth-side
// data so the rendering math is shared.

export const LUNAR_SITES = [
  { name: "APOLLO 11",      lat: 0.674,   lon: 23.473,  year: 1969, org: "US",   type: "CREWED" },
  { name: "APOLLO 12",      lat: -3.013,  lon: -23.422, year: 1969, org: "US",   type: "CREWED" },
  { name: "APOLLO 14",      lat: -3.646,  lon: -17.471, year: 1971, org: "US",   type: "CREWED" },
  { name: "APOLLO 15",      lat: 26.132,  lon: 3.634,   year: 1971, org: "US",   type: "CREWED" },
  { name: "APOLLO 16",      lat: -8.973,  lon: 15.501,  year: 1972, org: "US",   type: "CREWED" },
  { name: "APOLLO 17",      lat: 20.191,  lon: 30.772,  year: 1972, org: "US",   type: "CREWED" },
  { name: "LUNA 9",         lat: 7.08,    lon: -64.37,  year: 1966, org: "USSR", type: "LANDER" },
  { name: "LUNA 16",        lat: -0.513,  lon: 56.364,  year: 1970, org: "USSR", type: "SAMPLE RETURN" },
  { name: "LUNOKHOD 1",     lat: 38.28,   lon: -35.0,   year: 1970, org: "USSR", type: "ROVER" },
  { name: "CHANG'E 3",      lat: 44.12,   lon: -19.51,  year: 2013, org: "PRC",  type: "LANDER + ROVER" },
  { name: "CHANG'E 4",      lat: -45.5,   lon: 177.6,   year: 2019, org: "PRC",  type: "FAR SIDE LANDER" },
  { name: "CHANG'E 5",      lat: 43.06,   lon: -51.92,  year: 2020, org: "PRC",  type: "SAMPLE RETURN" },
  { name: "CHANDRAYAAN-3",  lat: -69.37,  lon: 32.32,   year: 2023, org: "IND",  type: "LANDER + ROVER" },
  { name: "SLIM",           lat: -13.32,  lon: 25.25,   year: 2024, org: "JPN",  type: "PRECISION LANDER" },
  { name: "IM-1 ODYSSEUS",  lat: -80.13,  lon: 1.44,    year: 2024, org: "US",   type: "COMMERCIAL LANDER" },
  { name: "BLUE GHOST M1",  lat: 18.56,   lon: 61.81,   year: 2025, org: "US",   type: "COMMERCIAL LANDER" },
];

// Active orbiters: altitude (km above the 1737 km lunar radius), inclination
// (degrees), period (minutes). Drawn as rings + moving dots in MOON scope.
export const LUNAR_ORBITERS = [
  { name: "LRO",                 alt: 50,   inclination: 90,  period: 113, color: "#00d4ff" },
  { name: "KPLO (DANURI)",       alt: 100,  inclination: 90,  period: 118, color: "#00ff88" },
  { name: "CHANDRAYAAN-2 ORB",   alt: 100,  inclination: 90,  period: 118, color: "#ff7700" },
];

// Selenographic lat/lon → unit position on the moon globe (same convention
// as utils/geo.js latLonToXYZ so textures and markers line up).
export function lunarLatLonToXYZ(latDeg, lonDeg, r = 1) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)];
}
