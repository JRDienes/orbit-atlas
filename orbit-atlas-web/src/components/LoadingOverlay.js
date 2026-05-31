import { COLORS as C, FONT } from "../theme";

// Full-screen loading overlay shown until satellite data is ready.
// Fades out (controlled by `fading`) once loading completes.
export default function LoadingOverlay({ fading }) {
  return (
    <>
      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
      `}</style>
      <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT, opacity: fading ? 0 : 1, transition: "opacity 0.9s ease", pointerEvents: fading ? "none" : "all" }}>
        <div style={{ color: C.cyan, fontSize: 32, fontWeight: "bold", letterSpacing: 8, marginBottom: 8 }}>ORBIT ATLAS</div>
        <div style={{ color: `${C.green}66`, fontSize: 12, letterSpacing: 3, marginBottom: 64 }}>SPACE OBJECT TRACKING SYSTEM</div>

        {/* Animated rings */}
        <div style={{ position: "relative", width: 90, height: 90, marginBottom: 48 }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 44, height: 44, borderRadius: "50%", border: `1px solid ${C.cyan}55`, animation: "pulse-ring 2s ease-out infinite" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 44, height: 44, borderRadius: "50%", border: `1px solid ${C.cyan}55`, animation: "pulse-ring 2s ease-out infinite 0.75s" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 66, height: 66, marginTop: -33, marginLeft: -33, borderRadius: "50%", border: "2px solid transparent", borderTopColor: C.cyan, borderRightColor: `${C.cyan}44`, animation: "orbit-spin 1.1s linear infinite" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, marginTop: -5, marginLeft: -5, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 14px ${C.cyan}`, animation: "dot-blink 1.5s ease-in-out infinite" }} />
        </div>

        <div style={{ color: C.cyan, fontSize: 13, letterSpacing: 3, marginBottom: 10 }}>LOADING OBJECTS...</div>
        <div style={{ color: `${C.cyan}44`, fontSize: 11, letterSpacing: 2 }}>FETCHING SATELLITE DATA</div>
      </div>
    </>
  );
}
