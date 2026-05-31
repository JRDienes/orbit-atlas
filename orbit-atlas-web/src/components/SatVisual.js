import { useState } from "react";
import { createPortal } from "react-dom";
import { ReactComponent as StarlinkV2 } from "../assets/sats/starlink_v2.svg";
import { ReactComponent as Kuiper } from "../assets/sats/kuiper.svg";
import { ReactComponent as AstSpaceMobile } from "../assets/sats/ast_spacemobile.svg";
import { COLORS as C } from "../theme";

// Registry of per-type satellite schematics, keyed by the ids from satVisualId().
const REGISTRY = {
  starlink_v2: StarlinkV2,
  kuiper: Kuiper,
  ast_spacemobile: AstSpaceMobile,
};

// Renders a satellite's schematic, tinted to `color` (the category accent) via
// the SVG's currentColor. Clicking the image opens it as a floating panel in the
// bottom-right (~1/4 screen), portaled to <body> so the column's backdrop-filter
// doesn't trap it. Click the backdrop or × to return. Null if no asset.
export default function SatVisual({ id, color, isMobile }) {
  const Cmp = REGISTRY[id];
  const [expanded, setExpanded] = useState(false);
  if (!Cmp) return null;

  // Floating panel pinned to the bottom-right. An invisible full-screen catcher
  // closes it on an outside click without dimming the rest of the site. Stays
  // mounted and animates both ways via opacity/transform.
  const overlay = createPortal(
    <>
      <div onClick={() => setExpanded(false)} style={{
        position: "fixed", inset: 0, zIndex: 1290, pointerEvents: expanded ? "auto" : "none",
      }} />
      <div style={{
        position: "fixed", right: 20, bottom: 20, zIndex: 1300,
        width: "min(46vw, 640px)", boxSizing: "border-box",
        background: `${C.bg}f5`, border: `1px solid ${color}44`, borderRadius: 10,
        backdropFilter: "blur(12px)", boxShadow: `0 10px 44px #000b`, padding: "10px 12px",
        transform: expanded ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
        opacity: expanded ? 1 : 0, pointerEvents: expanded ? "auto" : "none",
        transition: "opacity 0.26s ease, transform 0.3s cubic-bezier(0.2,0.8,0.2,1)",
      }}>
        <Cmp preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto", maxHeight: "44vh", color, display: "block" }} />
        <span onClick={() => setExpanded(false)} title="Close"
          style={{ position: "absolute", top: 6, right: 10, color, cursor: "pointer", fontSize: 24, lineHeight: 1, userSelect: "none" }}>×</span>
      </div>
    </>,
    document.body
  );

  if (isMobile) {
    return (
      <>
        <div onClick={() => setExpanded(true)} title="Expand"
          style={{ width: "100%", display: "flex", justifyContent: "center", padding: "2px 0", cursor: "pointer" }}>
          <Cmp style={{ width: "100%", maxWidth: 440, height: "auto", color, display: "block" }} />
        </div>
        {overlay}
      </>
    );
  }

  return (
    <>
      <div onClick={() => setExpanded(true)} title="Expand"
        style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <Cmp preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", color, display: "block" }} />
      </div>
      {overlay}
    </>
  );
}

// True when we have a schematic for this id (lets callers decide whether to show
// the flip toggle without importing the registry).
export function hasSatVisual(id) {
  return !!id && !!REGISTRY[id];
}
