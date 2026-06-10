import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "../utils/constants";
import { COLORS as C } from "../theme";
import { MOTION } from "../fx/motionConfig";

// ── Empty-state fills ────────────────────────────────────────────────────
// No panel should ever look blank. These are deliberately quiet: dim values,
// slow cycles — texture that says "the system is watching", not events.

// Orbit-class bucket for the idle dashboard, from apoapsis altitude (km).
function orbitClass(s) {
  const apo = s.apoapsis;
  if (apo == null) return null;
  if (apo < 2000) return "LEO";
  if (apo < 35000) return "MEO";
  if (apo < 37000) return "GEO";
  return "HEO";
}

// Satellite Viewer pre-selection: a mini situational dashboard — objects per
// orbit class with grow-in bars, plus the latest launches. Intended feel: an
// ops console summarizing the sky while it waits for tasking.
export function ViewerIdleDashboard({ sats }) {
  const { classes, recent, total } = useMemo(() => {
    const counts = { LEO: 0, MEO: 0, GEO: 0, HEO: 0 };
    for (const s of sats) {
      const oc = orbitClass(s);
      if (oc) counts[oc]++;
    }
    const recent = [...sats]
      .filter(s => s.launch_date)
      .sort((a, b) => (a.launch_date < b.launch_date ? 1 : -1))
      .slice(0, 6);
    return { classes: counts, recent, total: sats.length };
  }, [sats]);

  if (!MOTION.emptyStates || total === 0) {
    return (
      <div style={{ color: `${C.cyan}22`, fontSize: 12, textAlign: "center", paddingTop: 28, letterSpacing: 0.5, lineHeight: 1.7 }}>
        Select a country code chip<br />to browse its satellites
      </div>
    );
  }

  const max = Math.max(1, ...Object.values(classes));
  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ color: `${C.cyan}55`, fontSize: 9, letterSpacing: 2, marginBottom: 10 }}>ORBIT DISTRIBUTION · {total.toLocaleString()} TRACKED</div>
      {Object.entries(classes).map(([label, count], i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <div style={{ color: `${C.cyan}88`, fontSize: 10, letterSpacing: 1, width: 30, flexShrink: 0 }}>{label}</div>
          <div style={{ flex: 1, height: 3, background: `${C.cyan}11`, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              width: `${(count / max) * 100}%`, height: "100%", background: `${C.cyan}66`, borderRadius: 2,
              transformOrigin: "left center", animation: `hud-bar-in 0.4s ease-out ${i * 60}ms both`,
            }} />
          </div>
          <div style={{ color: `${C.cyan}66`, fontSize: 10, width: 48, textAlign: "right", flexShrink: 0 }}>{count.toLocaleString()}</div>
        </div>
      ))}

      <div style={{ color: `${C.cyan}55`, fontSize: 9, letterSpacing: 2, margin: "16px 0 8px" }}>RECENT LAUNCHES</div>
      {recent.map((s, i) => (
        <div key={s.norad_cat_id} className="hud-row-in" style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.cyan}0d`, animationDelay: `${i * 20}ms` }}>
          <div style={{ color: "#9ab", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.object_name || "UNKNOWN"}</div>
          <div style={{ color: `${C.cyan}66`, fontSize: 10, flexShrink: 0 }}>{s.launch_date}</div>
        </div>
      ))}
      <div style={{ color: `${C.cyan}33`, fontSize: 10, textAlign: "center", marginTop: 14, letterSpacing: 0.5 }}>
        Select a country code chip to browse
      </div>
    </div>
  );
}

const OBJECT_TIPS = [
  "Click any satellite for details",
  "Drag the globe to rotate the view",
  "Scroll to zoom between LEO and GEO",
  "Toggle the ISS tracker for a live feed",
  "Use the timeline to replay launches since 1957",
];

// Object Data pre-selection: a faint breathing reticle and rotating tips
// instead of a blank prompt. The reticle hints at what selection looks like.
export function ObjectDataIdle() {
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    if (!MOTION.emptyStates) return;
    const id = setInterval(() => setTipIdx(i => (i + 1) % OBJECT_TIPS.length), 6000);
    return () => clearInterval(id);
  }, []);

  if (!MOTION.emptyStates) {
    return <div style={{ color: `${C.cyan}22`, fontSize: 12, letterSpacing: 0.5 }}>Click any satellite for details</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 14, paddingBottom: 8 }}>
      {/* Faint pulsing reticle hint */}
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke={C.cyan} strokeWidth="1.2"
        style={{ animation: "hud-breathe 3.4s ease-out infinite" }}>
        <circle cx="22" cy="22" r="9" opacity="0.8" />
        <path d="M22 5 v7 M22 32 v7 M5 22 h7 M32 22 h7" />
        <path d="M8 3 h-5 v5 M36 3 h5 v5 M8 41 h-5 v-5 M36 41 h5 v-5" opacity="0.6" />
      </svg>
      <div key={tipIdx} className="hud-tip-in" style={{ color: `${C.cyan}55`, fontSize: 11, letterSpacing: 0.5, textAlign: "center" }}>
        {OBJECT_TIPS[tipIdx]}
      </div>
    </div>
  );
}

// Country Codes pre-selection: dim category chips that activate the category
// on click (and, via onHoverCategory, pulse that group on the globe). The
// panel reads as a menu of constellations rather than an empty box.
export function CountryCodesIdle({ onToggleCategory, onHoverCategory }) {
  if (!MOTION.emptyStates) {
    return <div style={{ color: `${C.cyan}44`, fontSize: 11, letterSpacing: 1 }}>Enable a filter category to see its country codes.</div>;
  }
  return (
    <div>
      <div style={{ color: `${C.cyan}44`, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>TAP A GROUP TO DRILL IN</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {CATEGORIES.map((cat, i) => (
          <span key={cat.id} className="hud-press hud-row-in"
            onClick={() => onToggleCategory && onToggleCategory(cat.id)}
            onMouseEnter={() => onHoverCategory && onHoverCategory(cat.id)}
            onMouseLeave={() => onHoverCategory && onHoverCategory(null)}
            style={{
              background: `${cat.color}14`, border: `1px solid ${cat.color}33`, color: `${cat.color}bb`,
              borderRadius: 3, fontSize: 9, padding: "3px 6px", letterSpacing: 1, cursor: "pointer",
              animationDelay: `${i * 20}ms`,
            }}>
            {cat.label.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
