import { CATEGORIES, COUNTRY_NAMES } from "../utils/constants";
import { COLORS as C } from "../theme";

// Right-side desktop panel: a satellite list for the focused country code (with
// pin checkboxes) over an object-data readout for the active pinned/selected sat.
export default function SatelliteViewer({
  sats, focusedCodes, focusedIndex, setFocusedIndex,
  pinnedSats, setPinnedSats, pinnedViewIndex, setPinnedViewIndex,
  selected, setSelected, setSelectedCodes, setFocusedCodes,
}) {
  const hasFocused = focusedCodes.length > 0;
  const current = hasFocused ? (focusedCodes[focusedIndex] || focusedCodes[0]) : null;
  const pinnedArr = [...pinnedSats];
  const clampedIdx = pinnedArr.length > 0 ? Math.min(pinnedViewIndex, pinnedArr.length - 1) : 0;
  const displaySat = pinnedArr.length > 0 ? pinnedArr[clampedIdx] : selected;
  const cat = current ? CATEGORIES.find(c => c.id === current.catId) : null;
  const accentColor = cat?.color || C.cyan;
  const listSats = current
    ? sats.filter(s => s.country_code === current.code).sort((a, b) => (a.launch_date || "9999") < (b.launch_date || "9999") ? -1 : 1)
    : [];
  const fullName = current ? (COUNTRY_NAMES[current.code] || current.code) : "";
  const total = focusedCodes.length;
  const navBtn = (enabled) => ({ color: enabled ? accentColor : `${accentColor}22`, cursor: enabled ? "pointer" : "default", fontSize: 20, padding: "0 3px", userSelect: "none", lineHeight: 1 });

  return (
    <div onWheel={e => e.stopPropagation()} style={{ position: "absolute", top: 80, right: 20, width: 300, height: "calc(100vh - 100px)", background: `${C.bg}cc`, border: `1px solid ${accentColor}33`, borderRadius: 8, backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top 70% — satellite list ── */}
      <div style={{ flex: 7, minHeight: 0, display: "flex", flexDirection: "column", padding: "14px 14px 0" }}>
        {/* Header */}
        <div style={{ flexShrink: 0, marginBottom: 8 }}>
          {hasFocused ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                <span onClick={() => total > 1 && setFocusedIndex((focusedIndex - 1 + total) % total)} style={navBtn(total > 1)}>‹</span>
                <div style={{ minWidth: 0, marginLeft: 2 }}>
                  <div style={{ color: accentColor, fontSize: 14, fontWeight: "bold", letterSpacing: 2 }}>{current.code}</div>
                  <div style={{ color: C.white, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</div>
                </div>
                <span onClick={() => total > 1 && setFocusedIndex((focusedIndex + 1) % total)} style={navBtn(total > 1)}>›</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {total > 1 && <span style={{ color: `${accentColor}55`, fontSize: 10, letterSpacing: 1 }}>{focusedIndex + 1}/{total}</span>}
                <span onClick={() => { setFocusedCodes([]); setFocusedIndex(0); setPinnedSats(new Set()); setPinnedViewIndex(0); setSelected(null); setSelectedCodes([]); }} style={{ color: `${C.cyan}44`, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</span>
              </div>
            </div>
          ) : (
            <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3 }}>SATELLITE VIEWER</div>
          )}
          {hasFocused && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div style={{ color: `${accentColor}55`, fontSize: 10, letterSpacing: 2 }}>{listSats.length} OBJECTS</div>
              {pinnedSats.size > 0 && current && <span onClick={() => setPinnedSats(prev => { const n = new Set(prev); for (const s of n) { if (s.country_code === current.code) n.delete(s); } return n; })} style={{ color: `${accentColor}66`, fontSize: 9, letterSpacing: 2, cursor: "pointer", borderLeft: `1px solid ${accentColor}22`, paddingLeft: 8 }}>CLEAR SELECTION</span>}
            </div>
          )}
        </div>
        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 6 }}>
          {hasFocused ? listSats.map(sat => {
            const isPinned = pinnedSats.has(sat);
            const isActive = isPinned && sat === pinnedArr[clampedIdx];
            const togglePin = () => {
              setPinnedSats(prev => {
                const n = new Set(prev);
                if (n.has(sat)) {
                  n.delete(sat);
                } else {
                  n.add(sat);
                  setPinnedViewIndex(n.size - 1);
                }
                return n;
              });
            };
            return (
              <div key={sat.norad_cat_id}
                onClick={togglePin}
                onMouseEnter={e => { if (!isPinned) e.currentTarget.style.background = `${accentColor}11`; }}
                onMouseLeave={e => { if (!isPinned) e.currentTarget.style.background = "transparent"; }}
                style={{ display: "flex", alignItems: "center", padding: "6px 4px", borderBottom: `1px solid ${accentColor}0d`, cursor: "pointer", borderRadius: 3, background: isActive ? "rgba(220,230,240,0.18)" : isPinned ? `${accentColor}22` : "transparent" }}>
                {/* Checkbox */}
                <div style={{ width: 13, height: 13, borderRadius: 2, border: `1px solid ${isPinned ? accentColor : `${accentColor}33`}`, background: isPinned ? `${accentColor}33` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8 }}>
                  {isPinned && <div style={{ width: 7, height: 7, borderRadius: 1, background: accentColor }} />}
                </div>
                <div style={{ color: isActive ? C.white : isPinned ? "#cccccc" : "#888888", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 8 }}>{sat.object_name || "UNKNOWN"}</div>
                <div style={{ color: `${accentColor}77`, fontSize: 11, flexShrink: 0 }}>{sat.launch_date ? sat.launch_date.substring(0, 4) : "—"}</div>
              </div>
            );
          }) : (
            <div style={{ color: `${C.cyan}22`, fontSize: 12, textAlign: "center", paddingTop: 28, letterSpacing: 0.5, lineHeight: 1.7 }}>Select a country code chip<br/>to browse its satellites</div>
          )}
        </div>
      </div>

      {/* ── Bottom 30% — object data ── */}
      <div style={{ flex: 3, minHeight: 0, borderTop: `1px solid ${accentColor}22`, overflowY: "auto", padding: "16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
          <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3 }}>OBJECT DATA</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {pinnedArr.length > 1 && <span onClick={() => { const ni = (clampedIdx - 1 + pinnedArr.length) % pinnedArr.length; setPinnedViewIndex(ni); const fi = focusedCodes.findIndex(f => f.code === pinnedArr[ni].country_code); if (fi !== -1) setFocusedIndex(fi); }} style={{ color: accentColor, cursor: "pointer", fontSize: 18, padding: "0 2px", userSelect: "none", lineHeight: 1 }}>‹</span>}
            {pinnedArr.length > 1 && <span style={{ color: `${accentColor}55`, fontSize: 10, letterSpacing: 1 }}>{clampedIdx + 1}/{pinnedArr.length}</span>}
            {pinnedArr.length > 1 && <span onClick={() => { const ni = (clampedIdx + 1) % pinnedArr.length; setPinnedViewIndex(ni); const fi = focusedCodes.findIndex(f => f.code === pinnedArr[ni].country_code); if (fi !== -1) setFocusedIndex(fi); }} style={{ color: accentColor, cursor: "pointer", fontSize: 18, padding: "0 2px", userSelect: "none", lineHeight: 1 }}>›</span>}
            {selected && pinnedArr.length === 0 && <span onClick={() => setSelected(null)} style={{ color: `${C.cyan}44`, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</span>}
          </div>
        </div>
        {displaySat ? (
          [["NAME", displaySat.object_name], ["TYPE", displaySat.object_type], ["COUNTRY", displaySat.country_code],
           ["LAUNCHED", displaySat.launch_date], ["INCLINATION", displaySat.inclination ? `${displaySat.inclination}°` : "N/A"],
           ["APOAPSIS", displaySat.apoapsis ? `${Math.round(displaySat.apoapsis)} km` : "N/A"],
           ["PERIAPSIS", displaySat.periapsis ? `${Math.round(displaySat.periapsis)} km` : "N/A"],
           ["PERIOD", displaySat.period ? `${Math.round(displaySat.period)} min` : "N/A"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 11 }}>
              <div style={{ color: `${C.cyan}66`, fontSize: 11, letterSpacing: 1, flexShrink: 0 }}>{label}</div>
              <div style={{ color: C.white, fontSize: 13, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "N/A"}</div>
            </div>
          ))
        ) : (
          <div style={{ color: `${C.cyan}22`, fontSize: 12, letterSpacing: 0.5 }}>Click any satellite for details</div>
        )}
      </div>

    </div>
  );
}
