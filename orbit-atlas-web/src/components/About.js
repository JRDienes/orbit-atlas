import { COLORS as C, FONT } from "../theme";

// Slide-out "About" panel. Stays mounted and animates via opacity/transform so
// the open/close transition runs both ways. Anchored under the header button.
export default function About({ open, onClose }) {
  return (
    <>
      {/* Backdrop — click to dismiss */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "#0006", zIndex: 900,
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", width: 460, maxWidth: "calc(100vw - 40px)",
        maxHeight: "calc(100vh - 100px)", overflowY: "auto", zIndex: 1000,
        background: `${C.bg}f5`, border: `1px solid ${C.cyan}44`, borderRadius: 12,
        backdropFilter: "blur(14px)", padding: "28px 30px 30px",
        boxShadow: `0 10px 50px #000b, 0 0 28px ${C.cyan}14`,
        fontFamily: FONT,
        opacity: open ? 1 : 0,
        transform: open ? "translate(-50%, -50%) scale(1)" : "translate(-50%, calc(-50% + 14px)) scale(0.96)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.2,0.8,0.2,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ color: C.cyan, fontSize: 22, fontWeight: "bold", letterSpacing: 5 }}>ORBIT ATLAS</div>
            <div style={{ color: `${C.green}88`, fontSize: 11, letterSpacing: 2, marginTop: 4 }}>SPACE OBJECT TRACKING SYSTEM</div>
          </div>
          <span onClick={onClose} style={{ color: `${C.cyan}88`, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "0 2px" }}>×</span>
        </div>

        <div style={{ color: "#cfe6f5", fontSize: 14, lineHeight: 1.7, letterSpacing: 0.3 }}>
          <p style={{ margin: "0 0 12px" }}>
            Orbit Atlas renders every active satellite tracked in Earth orbit — 21,000+ objects —
            on an interactive 3D globe, in real time.
          </p>
          <p style={{ margin: "0 0 12px" }}>
            Positions come from the U.S. Space Force's <span style={{ color: C.cyan }}>Space-Track</span> catalog,
            synced weekly. Filter by operator and country, explore constellations like Starlink and Kuiper,
            scrub launch history back to 1957, and watch the <span style={{ color: C.gold }}>ISS</span> live.
          </p>
          <p style={{ margin: "0 0 18px" }}>
            Each week an automated bot posts a recap of new launches — grouped by constellation and country —
            to X. Follow along for the weekly orbital roundup.
          </p>
        </div>

        <a href="https://x.com/OrbitAtlasX" target="_blank" rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            textDecoration: "none", padding: "11px 16px", borderRadius: 8,
            border: `1px solid ${C.cyan}`, color: C.cyan, background: `${C.cyan}14`,
            fontSize: 14, letterSpacing: 2, fontWeight: "bold", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${C.cyan}2a`; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${C.cyan}14`; }}>
          <span style={{ fontSize: 15, fontWeight: "bold" }}>𝕏</span> FOLLOW @ORBITATLASX
        </a>

        <div style={{ color: `${C.cyan}44`, fontSize: 9.5, letterSpacing: 1.5, textAlign: "center", marginTop: 14 }}>
          DATA · SPACE-TRACK.ORG &nbsp;|&nbsp; ISS · WHERETHEISS.AT
        </div>
      </div>
    </>
  );
}
