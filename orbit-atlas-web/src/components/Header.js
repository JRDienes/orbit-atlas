import { COLORS as C } from "../theme";

// Top header bar — logo (click to refresh), title, live object count, and an
// "about" hamburger button.
export default function Header({ isMobile, loading, visibleCount, onMenuClick }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: isMobile ? "12px 16px" : "20px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.cyan}22`, background: `linear-gradient(180deg, ${C.bg} 0%, transparent 100%)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 18 }}>
        <div onClick={() => window.location.reload()} style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, cursor: "pointer" }} title="Refresh">
          <img src={`${process.env.PUBLIC_URL}/orbit_atlas_logo.png`} alt="Orbit Atlas" style={{ height: isMobile ? 32 : 44, width: "auto", display: "block", maskImage: "radial-gradient(circle, black 55%, transparent 95%)", WebkitMaskImage: "radial-gradient(circle, black 55%, transparent 95%)" }} />
          <div>
            <div style={{ color: C.cyan, fontSize: isMobile ? 16 : 22, fontWeight: "bold", letterSpacing: isMobile ? 2 : 4 }}>ORBIT ATLAS</div>
            {!isMobile && <div style={{ color: `${C.green}88`, fontSize: 11, letterSpacing: 2 }}>SPACE OBJECT TRACKING SYSTEM</div>}
          </div>
        </div>
        <div onClick={onMenuClick} title="About" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, cursor: "pointer", padding: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 22, height: 2, background: C.cyan, borderRadius: 2 }} />
          ))}
        </div>
      </div>
      <div style={{ color: `${C.cyan}88`, fontSize: isMobile ? 10 : 12, letterSpacing: 2 }}>
        {loading ? "LOADING..." : `${visibleCount.toLocaleString()} OBJECTS`}
      </div>
    </div>
  );
}
