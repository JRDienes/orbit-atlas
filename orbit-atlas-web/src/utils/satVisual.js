// Maps a satellite to the id of its per-type schematic visual, or null when we
// don't have one yet. Pure — no React/Three.js. Keep the Starlink thresholds in
// sync with satWorker.js / constants.js.
import { STARLINK_GEN2_MIN, STARLINK_GEN3_MIN } from "./constants";

export function satVisualId(sat) {
  const name = (sat?.object_name || "").toUpperCase();
  if (name.includes("STARLINK")) {
    const m = name.match(/STARLINK-(\d+)/);
    const n = m ? parseInt(m[1], 10) : NaN;
    if (n >= STARLINK_GEN3_MIN) return null;       // V3 — no asset yet
    if (n >= STARLINK_GEN2_MIN) return "starlink_v2";
    return null;                                    // V1 — no asset yet
  }
  if (name.includes("KUIPER")) return "kuiper";
  if (name.includes("BLUEBIRD") || name.includes("SPACEMOBILE")) return "ast_spacemobile";
  return null;
}

// Visual for a Starlink generation chip code (V1/V2/V3). Every sat in a Starlink
// generation is identical, so the chip alone determines the schematic — no need
// to select an individual sat. Returns null for codes we haven't drawn yet.
const GEN_VISUAL = { V2: "starlink_v2" };
export function starlinkGenVisualId(code) {
  return GEN_VISUAL[code] || null;
}

// Visual for a whole single-design constellation category (Kuiper, AST, ...),
// shown when the category is toggled on with no individual sat selected.
const CATEGORY_VISUAL = { kuiper: "kuiper", ast_spacemobile: "ast_spacemobile" };
export function categoryVisualId(catId) {
  return CATEGORY_VISUAL[catId] || null;
}
