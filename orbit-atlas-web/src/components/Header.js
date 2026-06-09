import { useEffect, useState } from "react";
import { COLORS as C } from "../theme";
import { useUtcClock, useCountUp } from "../hooks/useHud";
import { MOTION } from "../fx/motionConfig";

// Quiet always-moving header signals: LIVE pulse, ticking UTC clock, and a
// DATA SYNC stamp that pings once when a refresh lands. These are ambient
// tier — they confirm the system is alive without ever grabbing focus.
function SystemStatus({ lastSync }) {
  const utc = useUtcClock(MOTION.headerSignals);
  // Re-key the ping span on each sync so the one-shot animation replays.
  const [pingKey, setPingKey] = useState(0);
  useEffect(() => { if (lastSync) setPingKey(k => k + 1); }, [lastSync]);
  if (!MOTION.headerSignals) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {/* LIVE — pulsing dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: "hud-pulse 2.2s ease-out infinite" }} />
        <span style={{ color: `${C.green}cc`, fontSize: 10, letterSpacing: 2, fontWeight: "bold" }}>LIVE</span>
      </div>
      {/* UTC clock — ticks every second, monospace via global font */}
      <div style={{ color: `${C.cyan}99`, fontSize: 12, letterSpacing: 1.5, fontVariantNumeric: "tabular-nums", minWidth: 96 }}>
        {utc} UTC
      </div>
      {/* DATA SYNC — timestamp with a one-shot ring ping on refresh */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ position: "relative", width: 8, height: 8, display: "inline-block" }}>
          <svg width="8" height="8" viewBox="0 0 8 8" style={{ position: "absolute", inset: 0 }}>
            <circle cx="4" cy="4" r="2.6" fill="none" stroke={`${C.cyan}aa`} strokeWidth="1" />
          </svg>
          {lastSync && (
            <span key={pingKey} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${C.cyan}`, animation: "hud-ping 0.6s ease-out 1 both" }} />
          )}
        </span>
        <span style={{ color: `${C.cyan}66`, fontSize: 10, letterSpacing: 1.5 }}>
          SYNC {lastSync ? new Date(lastSync).toUTCString().slice(17, 25) : "—"}
        </span>
      </div>
    </div>
  );
}

// Top header bar — logo (click to refresh), title, an "about" hamburger and a
// "global key" button, system status signals, and the live object count.
export default function Header({ isMobile, showObjectsLabel, loading, visibleCount, lastSync, onMenuClick, onKeyClick }) {
  // Counter ticks up/down to its new value instead of snapping (400ms ease-out).
  const animatedCount = useCountUp(visibleCount);
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
        <div onClick={onKeyClick} title="Global Key" className="hud-press" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", border: `1px solid ${C.cyan}44`, borderRadius: 6, padding: isMobile ? "5px 8px" : "6px 11px", background: `${C.cyan}0e` }}>
          {/* small legend grid icon */}
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={C.cyan} strokeWidth="1.3">
            <rect x="1" y="1" width="4" height="4" rx="1" /><rect x="7" y="1" width="4" height="4" rx="1" />
            <rect x="1" y="7" width="4" height="4" rx="1" /><rect x="7" y="7" width="4" height="4" rx="1" />
          </svg>
          <span style={{ color: C.cyan, fontSize: isMobile ? 10 : 11, letterSpacing: 2, fontWeight: "bold" }}>KEY</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 28 }}>
        {/* System status — desktop only; phones don't have the width */}
        {!isMobile && <SystemStatus lastSync={lastSync} />}

        {/* Live object count — large, bright, counts to its new value */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          {loading ? (
            <span style={{ color: `${C.cyan}cc`, fontSize: isMobile ? 11 : 14, letterSpacing: 2 }}>LOADING…</span>
          ) : (
            <>
              <span style={{ color: C.cyan, fontSize: isMobile ? 19 : 28, fontWeight: "bold", letterSpacing: 1, textShadow: `0 0 14px ${C.cyan}77`, fontVariantNumeric: "tabular-nums" }}>{Math.round(animatedCount).toLocaleString()}</span>
              {showObjectsLabel && <span style={{ color: `${C.cyan}aa`, fontSize: isMobile ? 10 : 12, letterSpacing: 2, fontWeight: "bold" }}>OBJECTS</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
