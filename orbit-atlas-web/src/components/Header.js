import { useEffect, useState } from "react";
import { COLORS as C } from "../theme";
import { useUtcClock, useCountUp } from "../hooks/useHud";
import { MOTION } from "../fx/motionConfig";
import { BODY_MENU } from "../utils/bodies";

// Centered body-navigation dropdown. The current body reads as a chip;
// opening it lists every registered body (Earth, Moon, the whole solar
// system, individual planets). Closes on selection or outside click.
function BodyMenu({ scope, onScopeChange }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  const current = BODY_MENU.find(b => b.id === scope)?.label || scope.toUpperCase();
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} onClick={e => e.stopPropagation()}>
      <div onClick={() => setOpen(o => !o)} className="hud-press"
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", border: `1px solid ${C.cyan}44`, borderRadius: 6, padding: "7px 14px", background: `${C.bg}aa`, backdropFilter: "blur(8px)", minWidth: 150, justifyContent: "center" }}>
        <span style={{ color: C.cyan, fontSize: 11, letterSpacing: 2, fontWeight: "bold" }}>{current}</span>
        <span className={`hud-chevron${open ? "" : " hud-collapsed"}`} style={{ color: `${C.cyan}88`, fontSize: 8 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", minWidth: 170, background: `${C.bg}f2`, border: `1px solid ${C.cyan}33`, borderRadius: 6, backdropFilter: "blur(12px)", overflow: "hidden", zIndex: 950 }}>
          {BODY_MENU.map((b, i) => {
            const on = scope === b.id;
            return (
              <div key={b.id} onClick={() => { onScopeChange(b.id); setOpen(false); }} className="hud-row hud-row-in"
                style={{ padding: "8px 14px", fontSize: 10, letterSpacing: 2, fontWeight: on ? "bold" : "normal", cursor: "pointer", userSelect: "none", color: on ? C.bg : `${C.cyan}aa`, background: on ? C.cyan : "transparent", borderBottom: b.id === "solar" ? `1px solid ${C.cyan}22` : "none", animationDelay: `${i * 15}ms` }}>
                {b.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Quiet always-moving header signals: LIVE pulse, ticking UTC clock, and a
// DATA SYNC stamp that pings once when a refresh lands. These are ambient
// tier — they confirm the system is alive without ever grabbing focus.
function SystemStatus({ lastSync, simTime, onSyncTime }) {
  const utc = useUtcClock(MOTION.headerSignals);
  // Re-key the ping span on each sync so the one-shot animation replays.
  const [pingKey, setPingKey] = useState(0);
  useEffect(() => { if (lastSync) setPingKey(k => k + 1); }, [lastSync]);
  if (!MOTION.headerSignals) return null;

  // When the sim clock has drifted from wall time (sun running at timeScale),
  // the clock shows SIM time in gold with a SYNC chip to snap back to now.
  const drifted = simTime != null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {/* LIVE — pulsing dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, animation: "hud-pulse 2.2s ease-out infinite" }} />
        <span style={{ color: `${C.green}cc`, fontSize: 10, letterSpacing: 2, fontWeight: "bold" }}>LIVE</span>
      </div>
      {/* Clock — wall UTC normally; gold SIM time when the sim has drifted */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ color: drifted ? `${C.gold}cc` : `${C.cyan}99`, fontSize: 12, letterSpacing: 1.5, fontVariantNumeric: "tabular-nums", minWidth: 96 }}>
          {drifted ? `${new Date(simTime).toUTCString().slice(17, 25)} SIM` : `${utc} UTC`}
        </div>
        {drifted && onSyncTime && (
          <span onClick={onSyncTime} title="Reset sim clock to real time" className="hud-press"
            style={{ cursor: "pointer", color: C.gold, border: `1px solid ${C.gold}55`, borderRadius: 4, fontSize: 9, letterSpacing: 1, padding: "2px 7px", userSelect: "none" }}>
            ⟲ SYNC
          </span>
        )}
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
export default function Header({ isMobile, showObjectsLabel, loading, visibleCount, lastSync, simTime, onSyncTime, onMenuClick, onKeyClick, realView, onToggleView, scope, onScopeChange }) {
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

        {/* View toggle — tactical HUD globe vs natural blue-marble Earth */}
        {onToggleView && (
          <div onClick={onToggleView} title={realView ? "Switch to tactical view" : "Switch to realistic view"} className="hud-press"
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", border: `1px solid ${realView ? C.green : `${C.cyan}44`}`, borderRadius: 6, padding: isMobile ? "5px 8px" : "6px 11px", background: realView ? `${C.green}14` : `${C.cyan}0e` }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={realView ? C.green : C.cyan} strokeWidth="1.1">
              <circle cx="6" cy="6" r="5" />
              <ellipse cx="6" cy="6" rx="2.2" ry="5" />
              <path d="M1.3 4.2 h9.4 M1.3 7.8 h9.4" />
            </svg>
            <span style={{ color: realView ? C.green : C.cyan, fontSize: isMobile ? 10 : 11, letterSpacing: 2, fontWeight: "bold" }}>{realView ? "REAL" : "TAC"}</span>
          </div>
        )}

      </div>

      {/* Body dropdown — NASA-Eyes-style navigation, centered in the header.
          One registry (utils/bodies.js) feeds this menu, the solar model,
          and the individual planet views — add a body there and it appears
          everywhere. Desktop only for now. */}
      {!isMobile && onScopeChange && <BodyMenu scope={scope} onScopeChange={onScopeChange} />}

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 28 }}>
        {/* System status — desktop only; phones don't have the width */}
        {!isMobile && <SystemStatus lastSync={lastSync} simTime={simTime} onSyncTime={onSyncTime} />}

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
