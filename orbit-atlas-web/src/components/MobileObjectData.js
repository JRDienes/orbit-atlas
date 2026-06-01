import { useState, useEffect } from "react";
import { CATEGORIES, COUNTRY_NAMES } from "../utils/constants";
import { satVisualId, starlinkGenVisualId, categoryVisualId } from "../utils/satVisual";
import SatVisual from "./SatVisual";
import { COLORS as C } from "../theme";

// Mobile bottom-sheet: the satellite selector + object readout. Mirrors the
// desktop SatelliteViewer. With a focused chip/constellation it shows that
// group's schematic + a tappable sat list; tapping a sat (or one tapped on the
// globe) shows its schematic-first readout with a flip to the data.
export default function MobileObjectData({ selected, setSelected, focusedCodes, focusedIndex, setFocusedIndex, sats }) {
  const hasFocused = focusedCodes.length > 0;
  const current = hasFocused ? (focusedCodes[focusedIndex] || focusedCodes[0]) : null;
  const cat = current ? CATEGORIES.find(c => c.id === current.catId) : null;
  const accentColor = cat?.color || C.cyan;
  const total = focusedCodes.length;

  const listSats = current
    ? sats.filter(s => s.category === current.catId && (current.whole || s.filterKey === current.code)).sort((a, b) => (a.launch_date || "9999") < (b.launch_date || "9999") ? -1 : 1)
    : [];
  const displayCode = current ? (current.whole ? (cat?.label || current.code) : current.code) : "";
  const fullName = current ? (current.whole ? "ALL SATELLITES" : (COUNTRY_NAMES[current.code] || current.code)) : "";

  const selVisualId = selected ? satVisualId(selected) : null;
  const selAccent = selected ? (CATEGORIES.find(c => c.id === selected.category)?.color || C.cyan) : accentColor;
  const focusVisualId = current
    ? (current.whole ? categoryVisualId(current.catId) : starlinkGenVisualId(current.code))
    : null;

  const [showData, setShowData] = useState(false);
  useEffect(() => { setShowData(false); }, [selected?.norad_cat_id]);
  const hasFlip = !!selVisualId;
  const showImage = hasFlip && !showData;

  // ── Selected satellite: schematic-first readout with a flip to the data ──
  if (selected) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasFocused && <span onClick={() => setSelected(null)} style={{ color: selAccent, cursor: "pointer", fontSize: 12, letterSpacing: 1 }}>‹ LIST</span>}
            <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3 }}>{showImage ? "SCHEMATIC" : "OBJECT DATA"}</div>
            {hasFlip && (
              <span onClick={() => setShowData(s => !s)}
                style={{ cursor: "pointer", color: selAccent, border: `1px solid ${selAccent}55`, borderRadius: 4, fontSize: 9, letterSpacing: 1, padding: "2px 7px" }}>
                {showImage ? "DATA ⟲" : "VIEW ⟲"}
              </span>
            )}
          </div>
          <span onClick={() => setSelected(null)} style={{ color: `${C.cyan}88`, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {showImage ? (
          <SatVisual id={selVisualId} color={selAccent} isMobile={true} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            {[
              ["NAME", selected.object_name], ["TYPE", selected.object_type],
              ["COUNTRY", selected.country_code], ["LAUNCHED", selected.launch_date],
              ["INCLINATION", selected.inclination ? `${selected.inclination}°` : "N/A"],
              ["APOAPSIS", selected.apoapsis ? `${Math.round(selected.apoapsis)} km` : "N/A"],
              ["PERIAPSIS", selected.periapsis ? `${Math.round(selected.periapsis)} km` : "N/A"],
              ["PERIOD", selected.period ? `${Math.round(selected.period)} min` : "N/A"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: `${C.cyan}88`, fontSize: 10, letterSpacing: 2 }}>{label}</div>
                <div style={{ color: C.white, fontSize: 13, marginTop: 2 }}>{value || "N/A"}</div>
              </div>
            ))}
          </div>
        )}
        </div>
      </>
    );
  }

  // ── Focused chip / constellation: schematic + tappable sat list ──
  if (current) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
          {/* Arrows pinned to the row ends; label flex-fills between. */}
          <span onClick={() => total > 1 && setFocusedIndex((focusedIndex - 1 + total) % total)} style={{ color: total > 1 ? accentColor : `${accentColor}22`, cursor: total > 1 ? "pointer" : "default", fontSize: 22, padding: "0 6px", userSelect: "none", flexShrink: 0 }}>‹</span>
          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div style={{ color: accentColor, fontSize: 14, fontWeight: "bold", letterSpacing: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayCode}</div>
            <div style={{ color: C.white, fontSize: 11, marginTop: 2 }}>{fullName} · {listSats.length}{total > 1 ? `  ·  ${focusedIndex + 1}/${total}` : ""}</div>
          </div>
          <span onClick={() => total > 1 && setFocusedIndex((focusedIndex + 1) % total)} style={{ color: total > 1 ? accentColor : `${accentColor}22`, cursor: total > 1 ? "pointer" : "default", fontSize: 22, padding: "0 6px", userSelect: "none", flexShrink: 0 }}>›</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {focusVisualId && (
            <div style={{ marginBottom: 12, borderBottom: `1px solid ${accentColor}22`, paddingBottom: 12 }}>
              <SatVisual id={focusVisualId} color={accentColor} isMobile={true} />
            </div>
          )}
          {listSats.map(sat => (
            <div key={sat.norad_cat_id} onClick={() => setSelected(sat)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 4px", borderBottom: `1px solid ${accentColor}11`, cursor: "pointer" }}>
              <div style={{ color: "#cfe6f5", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{sat.object_name || "UNKNOWN"}</div>
              <div style={{ color: `${accentColor}88`, fontSize: 12, flexShrink: 0 }}>{sat.launch_date ? sat.launch_date.substring(0, 4) : "—"}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── Nothing focused or selected ──
  return (
    <>
      <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3, marginBottom: 14 }}>OBJECT DATA</div>
      <div style={{ color: `${C.cyan}44`, fontSize: 11, letterSpacing: 1 }}>Tap a satellite on the globe, or pick a filter, to see it here.</div>
    </>
  );
}
