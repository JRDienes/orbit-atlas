import { COLORS as C } from "../theme";

// ISS live tracker panel.
// Desktop: a clickable card that toggles the tracker (with hover glow); the
// toggle/fly-to logic lives in App and is passed as `onToggle`.
// Mobile: a read-only readout inside the bottom sheet.
export default function ISSPanel({
  isMobile, issData, issEnabled, issHover, timelineYear, onToggle, onHoverChange,
}) {
  const preLaunch = timelineYear !== null && timelineYear < 1998;

  if (isMobile) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: issEnabled ? C.gold : `${C.gold}44`, boxShadow: issEnabled ? `0 0 8px ${C.gold}` : "none" }} />
          <div style={{ color: C.gold, fontSize: 11, fontWeight: "bold", letterSpacing: 3 }}>ISS TRACKER</div>
          {/* On/off toggle */}
          <div onClick={onToggle} style={{ marginLeft: "auto", width: 46, height: 26, borderRadius: 13, background: issEnabled ? C.gold : C.toggleOff, border: `1px solid ${issEnabled ? C.gold : `${C.gold}55`}`, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 2, left: issEnabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: issEnabled ? C.bg : `${C.gold}99`, transition: "left 0.2s" }} />
          </div>
        </div>
        <div style={{ color: `${C.gold}55`, fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>INTERNATIONAL SPACE STATION</div>
        <div style={{ opacity: issEnabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
        {preLaunch ? (
          <div style={{ color: `${C.gold}44`, fontSize: 11, letterSpacing: 1 }}>NOT YET LAUNCHED<br/><span style={{ fontSize: 9, letterSpacing: 2 }}>ZARYA MODULE: NOV 1998</span></div>
        ) : issData ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            {[
              ["ALTITUDE",  `${Number(issData.altitude).toFixed(1)} km`],
              ["VELOCITY",  `${Number(issData.velocity).toFixed(2)} km/s`],
              ["LATITUDE",  `${Number(issData.latitude).toFixed(4)}°`],
              ["LONGITUDE", `${Number(issData.longitude).toFixed(4)}°`],
              ["STATUS",    issData.visibility === "daylight" ? "DAYLIGHT" : "ECLIPSE"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: `${C.gold}66`, fontSize: 10, letterSpacing: 2 }}>{label}</div>
                <div style={{ color: C.gold, fontSize: 13, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: `${C.gold}66`, fontSize: 11 }}>ACQUIRING SIGNAL...</div>
        )}
        </div>
      </>
    );
  }

  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        background: `${C.bg}cc`,
        border: `1px solid ${issHover ? `${C.gold}88` : `${C.gold}33`}`,
        borderRadius: 8, padding: "12px 20px", backdropFilter: "blur(10px)", minWidth: 260,
        cursor: "pointer",
        boxShadow: issHover ? `0 0 18px ${C.gold}33, 0 0 6px ${C.gold}22` : "none",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: issEnabled ? C.gold : `${C.gold}44`, boxShadow: issEnabled ? `0 0 6px ${C.gold}` : "none", flexShrink: 0 }} />
        <div style={{ color: C.gold, fontSize: 10, letterSpacing: 3 }}>ISS LIVE</div>
        {!issEnabled && <div style={{ color: `${C.gold}66`, fontSize: 9, letterSpacing: 2, marginLeft: "auto" }}>OFF</div>}
      </div>
      {preLaunch ? (
        <div style={{ color: `${C.gold}44`, fontSize: 10, letterSpacing: 1 }}>NOT YET LAUNCHED<br/><span style={{ fontSize: 9, letterSpacing: 1 }}>ZARYA: NOV 1998</span></div>
      ) : issData ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px 8px" }}>
        {[["ALT",    `${Number(issData.altitude).toFixed(1)} km`],
          ["VEL",    `${Number(issData.velocity).toFixed(2)} km/s`],
          ["STATUS", issData.visibility === "daylight" ? "DAYLIGHT" : "ECLIPSE"],
          ["LAT",    `${Number(issData.latitude).toFixed(4)}°`],
          ["LON",    `${Number(issData.longitude).toFixed(4)}°`],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ color: `${C.gold}66`, fontSize: 9, letterSpacing: 2 }}>{label}</div>
            <div style={{ color: issEnabled ? C.gold : `${C.gold}44`, fontSize: 11 }}>{value}</div>
          </div>
        ))}
        </div>
      ) : (
        <div style={{ color: `${C.gold}66`, fontSize: 11, letterSpacing: 1 }}>ACQUIRING SIGNAL...</div>
      )}
    </div>
  );
}
