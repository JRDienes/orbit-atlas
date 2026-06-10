import { useState } from "react";
import { COLORS as C } from "../theme";

// ── Collapsible instrument module ───────────────────────────────────────
// Wraps a panel section in a header row with a rotating chevron. Collapse
// height-animates in 180ms ease-out (CSS grid-rows trick — no JS measuring);
// expand reverses with the content fading back in. Intended feel: a physical
// instrument module clicking shut, leaving a thin labeled bar.
//
// Props:
//   title          — string or node rendered next to the chevron
//   accent         — chevron/label color
//   openFlex       — flex-grow while open (sections share panel height
//                    proportionally, e.g. 7/3); collapsed = auto height
//   toggleOnHeader — if false, only the chevron toggles (use when the header
//                    row contains its own interactive controls)
export default function CollapsibleSection({ title, accent = C.cyan, children, defaultOpen = true, openFlex = 1, toggleOnHeader = true, style = {} }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => setOpen(o => !o);
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: open ? openFlex : "0 0 auto", ...style }}>
      {/* Header stays visible when collapsed — the thin labeled bar */}
      <div onClick={toggleOnHeader ? toggle : undefined}
        style={{ display: "flex", alignItems: "center", gap: 7, cursor: toggleOnHeader ? "pointer" : "default", userSelect: "none", flexShrink: 0 }}>
        <span onClick={toggleOnHeader ? undefined : (e => { e.stopPropagation(); toggle(); })}
          className={`hud-chevron${open ? "" : " hud-collapsed"}`}
          style={{ color: `${accent}88`, fontSize: 8, lineHeight: 1, cursor: "pointer", padding: "4px 2px", margin: "-4px -2px" }}>▼</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {typeof title === "string"
            ? <div style={{ color: accent, fontSize: 11, letterSpacing: 3 }}>{title}</div>
            : title}
        </div>
      </div>
      {/* Grid-rows 1fr→0fr animates height without measuring content */}
      <div className={`hud-collapse${open ? "" : " hud-collapsed"}`} style={open ? { flex: 1, minHeight: 0 } : undefined}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
