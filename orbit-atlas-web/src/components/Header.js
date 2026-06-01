import { COLORS as C } from "../theme";

// Top header bar — logo (click to refresh), title, an "about" hamburger and a
// "global key" button, and the live object count.
export default function Header({ isMobile, loading, visibleCount, onMenuClick, onKeyClick }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: isMobile ? "12px 16px" : "20px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.cyan}22`, background: `linear-gradient(180deg, ${C.bg} 0%, transparent 100%)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
        <div onClick={() => window.location.reload()} style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, cursor: "pointer" }} title="Refresh">
          <img src={`${process.env.PUBLIC_URL}/orbit_atlas_logo.png`} alt="Orbit Atlas" style={{ height: isMobile ? 32 : 44, width: "auto", display: "block", maskImage: "radial-gradient(circle, black 55%, transparent 95%)", WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 95%)" }} />
          <div>
            <div style={{ color: C.cyan, fontSize: isMobile ? 16 : 22, fontWeight: "bold", letterSpacing: isMobile ? 2 : 4 }}>ORBIT ATLAS</div>
            {!isMobile && <div style={{ color: `${C.green}88`, fontSize: 11, letterSpacing: 2 }}>SPACE OBJECT TRACKING SYSTEM</div>}
          </div>
        </div>

        {/* About hamburger */}
        <div onClick={onMenuClick} title="About" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, cursor: "pointer", padding: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 22, height: 2, background: C.cyan, borderRadius: 2 }} />
          ))}
        </div>

        {/* Global Key button */}
        <div onClick={onKeyClick} title="Global Key" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", border: `1px solid ${C.cyan}44`, borderRadius: 6, padding: isMobile ? "5px 8px" : "6px 11px", background: `${C.cyan}0e` }}>
          {/* small legend grid icon */}
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={C.cyan} strokeWidth="1.3">
            <rect x="1" y="1" width="4" height="4" rx="1" /><rect x="7" y="1" width="4" height="4" rx="1" />
            <rect x="1" y="7" width="4" height="4" rx="1" /><rect x="7" y="7" width="4" height="4" rx="1" />
          </svg>
          <span style={{ color: C.cyan, fontSize: isMobile ? 10 : 11, letterSpacing: 2, fontWeight: "bold" }}>KEY</span>
        </div>
      </div>

      {/* Live object count — large, bright */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {loading ? (
          <span style={{ color: `${C.cyan}cc`, fontSize: isMobile ? 11 : 14, letterSpacing: 2 }}>LOADING…</span>
        ) : (
          <>
            <span style={{ color: C.cyan, fontSize: isMobile ? 19 : 28, fontWeight: "bold", letterSpacing: 1, textShadow: `0 0 14px ${C.cyan}77` }}>{visibleCount.toLocaleString()}</span>
            <span style={{ color: `${C.cyan}aa`, fontSize: isMobile ? 9 : 12, letterSpacing: 2, fontWeight: "bold" }}>OBJECTS</span>
          </>
        )}
      </div>
    </div>
  );
}
