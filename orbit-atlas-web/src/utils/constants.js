// Static lookup tables for satellite categorization and display.
// Pure data — no React or Three.js dependencies.

// Starlink generation is read from the numeric suffix in "STARLINK-N":
//   Gen 1 (v1.0/v1.5): N < 30000   |   Gen 2 (V2 Mini): N >= 30000
//   Gen 3 (V3, launches on Starship) is not in the catalog yet. Its numbering
//   is unknown until the first batch appears — set STARLINK_GEN3_MIN to that
//   starting number when it does, and Gen 3 sats will split out automatically.
export const STARLINK_GEN2_MIN = 30000;
export const STARLINK_GEN3_MIN = Infinity;

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

export const CATEGORY_CODES = {
  starlink:       ["V1", "V2", "V3"],
  kuiper:         ["Name: KUIPER"],
  ast_spacemobile: ["Name: BLUEBIRD", "Name: SPACEMOBILE"],
  us:            ["US", "CA", "AUS", "NZ", "GLOB", "ORB", "O3B", "ITSO"],
  uk:            ["UK", "IM"],
  europe:        ["FR", "GER", "IT", "SPN", "NOR", "SWED", "BEL", "NETH", "SWTZ", "DEN",
                  "FIN", "POR", "POL", "CZE", "CZCH", "HUN", "ROM", "EST", "LTU", "HRV",
                  "SVN", "FGER", "GREC", "LUXE", "TURK", "ESA", "EUME", "EUTE", "SES", "FRIT"],
  russia:        ["CIS", "RUS", "SU", "USSR", "BELA", "KAZ", "UKR", "AZER", "SEAL", "TMMC", "STCT"],
  china:         ["PRC", "CHBZ", "CHLE", "NICO", "ABS", "PAKI", "LAOS", "NKOR"],
  japan:         ["JPN"],
  india:         ["IND"],
  middle_east:   ["SAUD", "UAE", "QAT", "KWT", "BHR", "JOR", "IRAN", "IRAQ", "AB"],
  asia_pacific:  ["SKOR", "INDO", "MALA", "THAI", "SING", "BGD", "TWN", "ASRA", "RP"],
  rest_of_world: ["All other codes"],
  debris:        ["Type: DEBRIS"],
  rocket_body:   ["Type: ROCKET BODY"],
};

export const COUNTRY_NAMES = {
  // Starlink generation chips (filtered like country codes)
  V1: "Starlink V1 (Gen 1)", V2: "Starlink V2 Mini (Gen 2)", V3: "Starlink V3 (Gen 3)",
  US: "United States", CA: "Canada", AUS: "Australia", NZ: "New Zealand",
  GLOB: "Global / Intelsat", ORB: "Orbcomm", O3B: "O3B Networks", ITSO: "ITSO",
  UK: "United Kingdom", IM: "Isle of Man",
  FR: "France", GER: "Germany", IT: "Italy", SPN: "Spain", NOR: "Norway",
  SWED: "Sweden", BEL: "Belgium", NETH: "Netherlands", SWTZ: "Switzerland",
  DEN: "Denmark", FIN: "Finland", POR: "Portugal", POL: "Poland",
  CZE: "Czech Republic", CZCH: "Czech Republic", HUN: "Hungary", ROM: "Romania",
  EST: "Estonia", LTU: "Lithuania", HRV: "Croatia", SVN: "Slovenia",
  FGER: "West Germany", GREC: "Greece", LUXE: "Luxembourg", TURK: "Turkey",
  ESA: "European Space Agency", EUME: "EUMETSAT", EUTE: "Eutelsat",
  SES: "SES S.A.", FRIT: "France / Italy",
  CIS: "Russia / CIS", RUS: "Russia", SU: "Soviet Union", USSR: "Soviet Union",
  BELA: "Belarus", KAZ: "Kazakhstan", UKR: "Ukraine", AZER: "Azerbaijan",
  SEAL: "Sea Launch", TMMC: "Turkmencosmos", STCT: "Russia / Kazakhstan",
  PRC: "China", CHBZ: "China / Brazil", CHLE: "China / Luxembourg",
  NICO: "China / Nigeria", ABS: "Asia Broadcast Satellite",
  PAKI: "Pakistan", LAOS: "Laos", NKOR: "North Korea",
  JPN: "Japan", IND: "India",
  SAUD: "Saudi Arabia", UAE: "United Arab Emirates", QAT: "Qatar",
  KWT: "Kuwait", BHR: "Bahrain", JOR: "Jordan", IRAN: "Iran", IRAQ: "Iraq",
  AB: "Arab Satellite Comms. Org.",
  SKOR: "South Korea", INDO: "Indonesia", MALA: "Malaysia", THAI: "Thailand",
  SING: "Singapore", BGD: "Bangladesh", TWN: "Taiwan", ASRA: "AsiaSat", RP: "Philippines",
};
