import { CATEGORIES } from "../utils/constants";
import { COLORS as C } from "../theme";

// Category filter toggles. Desktop renders a vertical list inside the left card;
// mobile renders a 2-column grid inside the bottom sheet. `onReset` is supplied
// by App since the desktop and mobile reset behaviors differ.
//
// Desktop rows are reactive-tier: faint glow + bg lift on hover (<100ms), and
// hovering a row pulses that category's satellites brighter on the globe for
// ~1s via `onHoverCategory` — you feel which dots you're about to toggle.
// `bare` skips the internal title so a CollapsibleSection can own the header.
export default function FilterPanel({ isMobile, active, onToggleCategory, onReset, onHoverCategory, bare }) {
  const items = CATEGORIES.map(cat => {
    const on = active.includes(cat.id);
    const dimmed = !(active.length === 0 || on);
    if (isMobile) {
      return (
        <div key={cat.id} onClick={() => onToggleCategory(cat.id)}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", opacity: dimmed ? 0.4 : 1, padding: "6px 0" }}>
          <div style={{ width: 34, height: 18, borderRadius: 9, background: on ? cat.color : C.toggleOff, border: `1px solid ${cat.color}`, flexShrink: 0, position: "relative" }}>
            <div style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 12, height: 12, borderRadius: "50%", background: on ? C.bg : cat.color, transition: "left 0.2s" }} />
          </div>
          <div style={{ color: cat.color, fontSize: 11, letterSpacing: 0.5 }}>{cat.label}</div>
        </div>
      );
    }
    return (
      <div key={cat.id} onClick={() => onToggleCategory(cat.id)}
        onMouseEnter={() => onHoverCategory && onHoverCategory(cat.id)}
        onMouseLeave={() => onHoverCategory && onHoverCategory(null)}
        className="hud-row hud-accent-row"
        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, cursor: "pointer", opacity: dimmed ? 0.4 : 1, padding: "4px 6px", borderRadius: 3, color: cat.color }}>
        <div style={{ width: 36, height: 18, borderRadius: 9, background: on ? cat.color : C.toggleOff, border: `1px solid ${cat.color}`, transition: "background 0.15s ease-out", position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 12, height: 12, borderRadius: "50%", background: on ? C.bg : cat.color, transition: "left 0.15s ease-out" }} />
        </div>
        <div style={{ color: cat.color, fontSize: 12, letterSpacing: 1 }}>{cat.label}</div>
      </div>
    );
  });

  if (isMobile) {
    return (
      <>
        <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3, marginBottom: 16 }}>FILTER OBJECTS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 16 }}>
          {items}
        </div>
        <div onClick={onReset} style={{ color: `${C.cyan}88`, fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center", padding: "10px 0", borderTop: `1px solid ${C.cyan}22` }}>RESET ALL FILTERS</div>
      </>
    );
  }

  return (
    <>
      {!bare && <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3, marginBottom: 16, flexShrink: 0 }}>FILTER OBJECTS</div>}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 6, marginTop: bare ? 10 : 0 }}>
        {items}
        <div style={{ borderTop: `1px solid ${C.cyan}22`, marginTop: 8, paddingTop: 12 }}>
          <div onClick={onReset} className="hud-press" style={{ color: `${C.cyan}88`, fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center" }}>RESET FILTERS</div>
        </div>
      </div>
    </>
  );
}
