import { COLORS as C, FONT } from "../theme";

// Year timeline scrubber — select, range slider, and step/play controls.
// Renders inner content only; the desktop card wrapper lives in App.
// `isMobile` switches the few sizing values between the two layouts.
export default function TimelineControl({
  isMobile, timelineYear, setTimelineYear, currentYear,
  timelinePlaying, onStepBack, onTogglePlay, onStepForward,
}) {
  const onYear = e => {
    const y = Number(e.target.value);
    setTimelineYear(y >= currentYear ? null : y);
  };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 16 : 8 }}>
        <div style={{ color: C.cyan, fontSize: isMobile ? 11 : 10, letterSpacing: 3 }}>TIMELINE</div>
        <select
          value={timelineYear ?? currentYear}
          onChange={onYear}
          style={{ background: C.bg, border: `1px solid ${C.cyan}44`, color: C.cyan, fontSize: isMobile ? 15 : 13, fontWeight: "bold", padding: isMobile ? "4px 8px" : "3px 6px", borderRadius: 4, cursor: "pointer", fontFamily: FONT, letterSpacing: 2 }}
        >
          <option value={currentYear}>PRESENT</option>
          {Array.from({ length: currentYear - 1957 }, (_, i) => currentYear - 1 - i).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <input type="range" min={1957} max={currentYear} step={1}
        value={timelineYear ?? currentYear}
        onChange={onYear}
        style={{ width: "100%", accentColor: C.cyan, cursor: "pointer", marginBottom: isMobile ? 10 : 6 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 16 : 0 }}>
        <span style={{ color: `${C.cyan}55`, fontSize: isMobile ? 10 : 9, letterSpacing: 1 }}>1957</span>
        <div style={{ display: "flex", gap: isMobile ? 8 : 5, alignItems: "center" }}>
          {[
            { label: "←", action: onStepBack },
            { label: timelinePlaying ? "⏸" : "▶", action: onTogglePlay, active: timelinePlaying },
            { label: "→", action: onStepForward },
          ].map(btn => (
            <div key={btn.label} onClick={btn.action} style={{ color: btn.active ? C.cyan : `${C.cyan}88`, fontSize: isMobile ? 16 : 12, cursor: "pointer", padding: isMobile ? "4px 12px" : "2px 9px", border: `1px solid ${btn.active ? C.cyan : `${C.cyan}33`}`, borderRadius: isMobile ? 4 : 3, background: btn.active ? `${C.cyan}22` : "transparent", userSelect: "none" }}>
              {btn.label}
            </div>
          ))}
        </div>
        <span style={{ color: `${C.cyan}55`, fontSize: isMobile ? 10 : 9, letterSpacing: 1 }}>PRESENT</span>
      </div>
    </>
  );
}
