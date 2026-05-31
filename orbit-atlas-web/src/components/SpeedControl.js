import { COLORS as C } from "../theme";

// Simulation-speed control — range slider plus preset buttons.
// Renders inner content only; the desktop card wrapper lives in App.
// `isMobile` switches the few sizing/layout values between the two layouts.
const PRESETS = [["PAUSE", 0], ["1×", 1], ["60×", 60], ["600×", 600], ["3600×", 3600]];

export default function SpeedControl({ isMobile, timeScale, onChange }) {
  return (
    <>
      <div style={{ color: C.cyan, fontSize: isMobile ? 11 : 10, letterSpacing: 3, marginBottom: isMobile ? 16 : 8 }}>SIMULATION SPEED</div>
      <input type="range" min="0" max="3600" step="10" value={timeScale}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.cyan, cursor: "pointer", marginBottom: isMobile ? 16 : 8 }} />
      <div style={{ display: "flex", justifyContent: isMobile ? "space-between" : "center", gap: 6, marginBottom: isMobile ? 12 : 8 }}>
        {PRESETS.map(([label, val]) => (
          <div key={val} onClick={() => onChange(val)}
            style={{ ...(isMobile ? { flex: 1, textAlign: "center" } : {}), background: timeScale === val ? `${C.cyan}33` : "transparent", border: `1px solid ${timeScale === val ? C.cyan : `${C.cyan}44`}`, borderRadius: isMobile ? 6 : 4, color: timeScale === val ? C.cyan : `${C.cyan}88`, fontSize: isMobile ? 12 : 10, padding: isMobile ? "8px 4px" : "3px 8px", letterSpacing: 1, cursor: "pointer" }}>
            {label}
          </div>
        ))}
      </div>
      <div style={{ color: C.cyan, fontSize: isMobile ? 13 : 12, letterSpacing: 2, textAlign: "center" }}>
        {timeScale === 0 ? "PAUSED" : timeScale === 1 ? "REAL TIME" : `${timeScale}×`}
      </div>
    </>
  );
}
