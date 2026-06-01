import { useMemo } from "react";
import { CATEGORIES, CATEGORY_CODES, COUNTRY_NAMES } from "../utils/constants";
import { COLORS as C, FONT } from "../theme";

const isSentinel = (code) => code.startsWith("Name:") || code.startsWith("Type:") || code === "All other codes";

// Slide-out "Global Key" — a legend of every categorized bucket and the codes
// used in the selectors (e.g. FR / France), each with its live object count.
export default function GlobalKey({ open, onClose, sats, isMobile }) {
  // Count totals per category and per (category, code). Built once per data set.
  const { perCat, perCatCode, total, restCodes } = useMemo(() => {
    const perCat = {}, perCatCode = {};
    const list = sats || [];
    for (const s of list) {
      perCat[s.category] = (perCat[s.category] || 0) + 1;
      const k = `${s.category}|${s.filterKey}`;
      perCatCode[k] = (perCatCode[k] || 0) + 1;
    }
    // Rest of World has no predefined codes — derive them from the data.
    const PREFIX = "rest_of_world|";
    const restCodes = Object.keys(perCatCode)
      .filter(k => k.startsWith(PREFIX))
      .map(k => ({ code: k.slice(PREFIX.length), count: perCatCode[k] }))
      .filter(r => r.code && r.code !== "undefined" && r.code !== "null")
      .sort((a, b) => b.count - a.count);
    return { perCat, perCatCode, total: list.length, restCodes };
  }, [sats]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "#0007", zIndex: 900,
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", zIndex: 1000,
        width: isMobile ? "calc(100vw - 24px)" : 480, maxWidth: "calc(100vw - 24px)",
        height: isMobile ? "84vh" : "80vh",
        background: `${C.bg}f7`, border: `1px solid ${C.cyan}44`, borderRadius: 12,
        backdropFilter: "blur(14px)", boxShadow: `0 10px 50px #000b, 0 0 28px ${C.cyan}14`,
        fontFamily: FONT, display: "flex", flexDirection: "column", overflow: "hidden",
        opacity: open ? 1 : 0,
        transform: open ? "translate(-50%, -50%) scale(1)" : "translate(-50%, calc(-50% + 14px)) scale(0.96)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.2,0.8,0.2,1)",
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: "22px 24px 14px", borderBottom: `1px solid ${C.cyan}22` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: C.cyan, fontSize: 19, fontWeight: "bold", letterSpacing: 4 }}>GLOBAL KEY</div>
              <div style={{ color: `${C.green}88`, fontSize: 10.5, letterSpacing: 2, marginTop: 4 }}>OBJECT CATEGORIES & CODES</div>
            </div>
            <span onClick={onClose} style={{ color: `${C.cyan}88`, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "0 2px" }}>×</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
            <span style={{ color: C.cyan, fontSize: 22, fontWeight: "bold", textShadow: `0 0 12px ${C.cyan}66` }}>{total.toLocaleString()}</span>
            <span style={{ color: `${C.cyan}99`, fontSize: 11, letterSpacing: 2 }}>TOTAL OBJECTS</span>
          </div>
        </div>

        {/* Scrollable legend */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
          {CATEGORIES.map(cat => {
            // Rest of World has no predefined codes — use the ones derived from
            // the data; every other category uses its fixed code list.
            const rows = cat.id === "rest_of_world"
              ? restCodes
              : (CATEGORY_CODES[cat.id] || []).filter(c => !isSentinel(c)).map(code => ({ code, count: perCatCode[`${cat.id}|${code}`] || 0 }));
            return (
              <div key={cat.id} style={{ marginBottom: 18 }}>
                {/* Category header */}
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7, paddingBottom: 6, borderBottom: `1px solid ${cat.color}33` }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color, boxShadow: `0 0 8px ${cat.color}`, flexShrink: 0 }} />
                  <span style={{ color: cat.color, fontSize: 13, fontWeight: "bold", letterSpacing: 2, flex: 1 }}>{cat.label.toUpperCase()}</span>
                  <span style={{ color: C.white, fontSize: 14, fontWeight: "bold" }}>{(perCat[cat.id] || 0).toLocaleString()}</span>
                </div>
                {/* Code rows */}
                {rows.map(({ code, count }) => (
                  <div key={code} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "5px 2px 5px 16px" }}>
                    <span style={{ color: cat.color, fontSize: 16, fontWeight: "bold", letterSpacing: 1, minWidth: 56, flexShrink: 0 }}>{code}</span>
                    <span style={{ color: "#cfe6f5", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{COUNTRY_NAMES[code] || code}</span>
                    <span style={{ color: `${cat.color}cc`, fontSize: 13, flexShrink: 0 }}>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
