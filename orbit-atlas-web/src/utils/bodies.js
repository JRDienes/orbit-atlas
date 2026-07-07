// ── Celestial body registry ──────────────────────────────────────────────
// Single source of truth for the body dropdown and the solar-system model.
// Add a row here and it appears in the dropdown, in the solar model, and
// gets a basic individual globe view automatically. Earth and the Moon keep
// their richer dedicated scenes.
//
// Solar-model `dist` and `size` are stylized (log-compressed) — a true-scale
// solar system is invisible on a screen. Orbital angles ARE real: each
// planet sits at its mean longitude for the sim date (L0 at J2000 + mean
// motion), so the layout matches the actual arrangement of the sky.

export const TEX_BASE = "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/";

// `rings`: { inner, outer } in planet radii, with per-ring opacity/color —
//   all four giants have ring systems (Saturn's is just the loud one).
// `tilt`: axial tilt in radians, applied to rings + moon orbits (Uranus's
//   near-90° tilt makes its whole system orbit "vertically" — accurate!).
// `moons`: the famous ones — dist in planet radii (compressed), period in
//   days (negative = retrograde, e.g. Triton), size in scene units.
export const PLANETS = [
  { id: "mercury", label: "MERCURY", tex: "mercurymap.jpg", color: 0x9c8e82, size: 0.20, dist: 4.0,  periodDays: 87.97,   L0: 252.25, tilt: 0, facts: { diameter: "4,879 km",   day: "58.6 days",  year: "88 days" } },
  { id: "venus",   label: "VENUS",   tex: "venusmap.jpg",   color: 0xd8b272, size: 0.30, dist: 5.2,  periodDays: 224.70,  L0: 181.98, tilt: 0, facts: { diameter: "12,104 km",  day: "243 days",   year: "225 days" } },
  { id: "earth",   label: "EARTH",   tex: null,             color: 0x2266aa, size: 0.32, dist: 6.4,  periodDays: 365.25,  L0: 100.47, tilt: 0.41, facts: { diameter: "12,742 km",  day: "24 hours",   year: "365.25 days" } },
  { id: "mars",    label: "MARS",    tex: "marsmap1k.jpg",  color: 0xb5582e, size: 0.26, dist: 7.6,  periodDays: 686.98,  L0: 355.45, tilt: 0.44, facts: { diameter: "6,779 km",   day: "24.6 hours", year: "687 days" },
    moons: [
      { name: "PHOBOS", dist: 1.8, period: 0.319, size: 0.030, color: 0x9a8d80 },
      { name: "DEIMOS", dist: 2.6, period: 1.263, size: 0.026, color: 0xa89a8c },
    ] },
  { id: "jupiter", label: "JUPITER", tex: "jupitermap.jpg", color: 0xc9a878, size: 0.62, dist: 9.6,  periodDays: 4332.59, L0: 34.40,  tilt: 0.05, facts: { diameter: "139,820 km", day: "9.9 hours",  year: "11.9 years" },
    rings: { inner: 1.45, outer: 1.75, opacity: 0.10, color: 0xb09878 },
    moons: [
      { name: "IO",       dist: 1.9, period: 1.769,  size: 0.045, color: 0xd8c060 },
      { name: "EUROPA",   dist: 2.5, period: 3.551,  size: 0.040, color: 0xcfc4b0 },
      { name: "GANYMEDE", dist: 3.1, period: 7.155,  size: 0.062, color: 0x9a8c78 },
      { name: "CALLISTO", dist: 3.8, period: 16.689, size: 0.055, color: 0x7a6f63 },
    ] },
  { id: "saturn",  label: "SATURN",  tex: "saturnmap.jpg",  color: 0xd9c08a, size: 0.55, dist: 11.8, periodDays: 10759.2, L0: 49.95,  tilt: 0.47, facts: { diameter: "116,460 km", day: "10.7 hours", year: "29.5 years" },
    rings: { inner: 1.24, outer: 2.27, opacity: 0.55, color: 0xcdb98a },
    moons: [
      { name: "ENCELADUS", dist: 2.55, period: 1.370,  size: 0.030, color: 0xe8e8e8 },
      { name: "RHEA",      dist: 3.0,  period: 4.518,  size: 0.036, color: 0xb0aca6 },
      { name: "TITAN",     dist: 3.6,  period: 15.945, size: 0.065, color: 0xc8943a },
    ] },
  { id: "uranus",  label: "URANUS",  tex: "uranusmap.jpg",  color: 0x88c4cc, size: 0.42, dist: 13.8, periodDays: 30685.4, L0: 313.23, tilt: 1.71, facts: { diameter: "50,724 km",  day: "17.2 hours", year: "84 years" },
    rings: { inner: 1.6, outer: 2.0, opacity: 0.20, color: 0x9ab4bc },
    moons: [
      { name: "MIRANDA", dist: 2.4, period: 1.413, size: 0.028, color: 0xb8c4c8 },
      { name: "TITANIA", dist: 3.2, period: 8.706, size: 0.042, color: 0xa0b0b4 },
    ] },
  { id: "neptune", label: "NEPTUNE", tex: "neptunemap.jpg", color: 0x4666c8, size: 0.40, dist: 15.6, periodDays: 60190,   L0: 304.88, tilt: 0.49, facts: { diameter: "49,244 km",  day: "16.1 hours", year: "165 years" },
    rings: { inner: 1.7, outer: 2.1, opacity: 0.12, color: 0x8898c0 },
    moons: [
      { name: "TRITON", dist: 2.8, period: -5.877, size: 0.050, color: 0xd8cfc8 }, // retrograde
    ] },
];

// Dropdown entries, in display order. Earth and Moon route to their rich
// scenes; "solar" is the system-wide model; the rest are basic globe views.
export const BODY_MENU = [
  { id: "earth", label: "EARTH" },
  { id: "moon",  label: "MOON" },
  { id: "solar", label: "SOLAR SYSTEM" },
  ...PLANETS.filter(p => p.id !== "earth").map(p => ({ id: p.id, label: p.label })),
];

// Mean longitude (degrees) of a planet at a JS-epoch millisecond timestamp —
// real ephemeris-grade is overkill; mean motion puts every planet within a
// few degrees of truth, which reads correctly at model scale.
export function planetLongitudeDeg(planet, timeMs) {
  const d = (timeMs - Date.UTC(2000, 0, 1, 12)) / 86400000;
  return (planet.L0 + (360 / planet.periodDays) * d) % 360;
}
