// Pure geometry helpers for mapping orbital altitude / lat-lon into the
// scene's normalized coordinate space. No React or Three.js dependencies.

// Logarithmic altitude scale so LEO, MEO, and GEO are all visually distinct.
export function altToRadius(altKm) {
  return 1.05 + Math.log(1 + Math.min(Math.max(200, altKm), 42000) / 6371);
}

export function latLonToXYZ(latDeg, lonDeg, altKm) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const r = altToRadius(altKm);
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)];
}
