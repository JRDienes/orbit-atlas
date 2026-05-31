import { COLORS as C } from "../theme";

// Brief "Welcome" banner shown between the loading screen fading out and the
// satellite points fading in. `visible` drives the opacity transition.
export default function WelcomeBanner({ isMobile, visible }) {
  return (
    <div style={{
      position: "absolute", top: isMobile ? "15%" : "17%", left: "50%",
      transform: "translateX(-50%)", textAlign: "center",
      pointerEvents: "none", zIndex: 100,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.4s ease",
    }}>
      <div style={{ color: C.cyan, fontSize: isMobile ? 16 : 22, fontWeight: "bold", letterSpacing: isMobile ? 3 : 6 }}>WELCOME TO ORBIT ATLAS</div>
      <div style={{ color: `${C.cyan}55`, fontSize: isMobile ? 10 : 11, letterSpacing: 3, marginTop: 6 }}>INITIALIZING SATELLITE POSITIONS</div>
    </div>
  );
}
