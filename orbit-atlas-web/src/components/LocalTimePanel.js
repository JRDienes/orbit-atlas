import { useEffect, useState } from "react";
import { COLORS as C, FONT } from "../theme";

// ── Local time panel ─────────────────────────────────────────────────────
// Lives with the time controls. Shows the SIM clock rendered in a selectable
// time zone (auto-detected from the browser by default), so you can read the
// sim in YOUR local time. The clock runs at the sim's timeScale along with
// the sun/satellites; SYNC NOW snaps the sim back to the actual current
// time — which is simply retrieved from the system clock (Date.now()), then
// displayed through the chosen zone.

const ZONES = [
  ["UTC", "UTC"],
  ["America/New_York", "New York"],
  ["America/Chicago", "Chicago"],
  ["America/Denver", "Denver"],
  ["America/Los_Angeles", "Los Angeles"],
  ["America/Sao_Paulo", "São Paulo"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris"],
  ["Europe/Moscow", "Moscow"],
  ["Asia/Dubai", "Dubai"],
  ["Asia/Kolkata", "India"],
  ["Asia/Shanghai", "Beijing"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"],
];

function zoneAbbr(tz, date) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(date).find(p => p.type === "timeZoneName")?.value || "";
  } catch { return ""; }
}

export default function LocalTimePanel({ isMobile, getSimTime, onSync }) {
  // Auto-detect the user's zone; add it to the list if it's not a preset
  const [autoTz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [tz, setTz] = useState(autoTz);
  const [hour12, setHour12] = useState(false); // 24H by default — ops style
  const [now, setNow] = useState(() => getSimTime());
  const [drifted, setDrifted] = useState(false);

  useEffect(() => {
    const tick = () => {
      const t = getSimTime();
      setNow(t);
      setDrifted(Math.abs(t - Date.now()) > 120000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [getSimTime]);

  const zones = ZONES.some(([z]) => z === autoTz) ? ZONES : [[autoTz, `${autoTz.split("/").pop()?.replace(/_/g, " ")} (yours)`], ...ZONES];
  const date = new Date(now);
  let timeStr = "—";
  try {
    timeStr = date.toLocaleTimeString(hour12 ? "en-US" : "en-GB", { timeZone: tz, hour12 });
  } catch { timeStr = date.toUTCString().slice(17, 25); }
  const abbr = zoneAbbr(tz, date);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3 }}>
        LOCAL TIME{drifted && <span style={{ color: C.gold, marginLeft: 8, fontSize: 9, letterSpacing: 2 }}>SIM</span>}
      </div>
      <div style={{ color: drifted ? C.gold : C.white, fontSize: isMobile ? 22 : 20, fontWeight: "bold", letterSpacing: 2, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {timeStr}<span style={{ fontSize: 10, color: drifted ? `${C.gold}99` : `${C.cyan}88`, marginLeft: 7, letterSpacing: 1 }}>{abbr}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* 12h/24h display toggle */}
        <span onClick={() => setHour12(h => !h)} title="Toggle 12/24-hour display" className="hud-press"
          style={{ cursor: "pointer", color: `${C.cyan}88`, border: `1px solid ${C.cyan}33`, borderRadius: 4, fontSize: 9, letterSpacing: 1, padding: "4px 7px", userSelect: "none", whiteSpace: "nowrap" }}>
          {hour12 ? "12H" : "24H"}
        </span>
        <select value={tz} onChange={e => setTz(e.target.value)}
          style={{ background: C.bg, color: `${C.cyan}cc`, border: `1px solid ${C.cyan}44`, borderRadius: 4, fontSize: 10, letterSpacing: 1, padding: "3px 4px", fontFamily: FONT, outline: "none", maxWidth: 130 }}>
          {zones.map(([z, label]) => <option key={z} value={z}>{label}</option>)}
        </select>
        <span onClick={onSync} title="Reset the sim clock to the actual current time" className="hud-press"
          style={{ cursor: "pointer", color: drifted ? C.gold : `${C.cyan}88`, border: `1px solid ${drifted ? `${C.gold}66` : `${C.cyan}33`}`, borderRadius: 4, fontSize: 9, letterSpacing: 1.5, padding: "4px 8px", userSelect: "none", whiteSpace: "nowrap" }}>
          ⟲ SYNC NOW
        </span>
      </div>
    </div>
  );
}
