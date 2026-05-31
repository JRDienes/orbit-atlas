import { useState, useEffect } from "react";
import { CATEGORIES } from "../utils/constants";
import { satVisualId } from "../utils/satVisual";
import SatVisual from "./SatVisual";
import { COLORS as C } from "../theme";

// Mobile bottom-sheet readout for the currently selected satellite. Shows the
// per-type schematic first (when one exists) with a flip toggle to the data.
export default function MobileObjectData({ selected, onDeselect }) {
  const selectedId = selected?.norad_cat_id;
  const visualId = selected ? satVisualId(selected) : null;
  const accentColor = (selected && CATEGORIES.find(c => c.id === selected.category)?.color) || C.cyan;
  const [showData, setShowData] = useState(false);
  useEffect(() => { setShowData(false); }, [selectedId]);
  const showImage = !!visualId && !showData;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3 }}>{showImage ? "SCHEMATIC" : "OBJECT DATA"}</div>
        {visualId && (
          <span onClick={() => setShowData(s => !s)}
            style={{ cursor: "pointer", color: accentColor, border: `1px solid ${accentColor}55`, borderRadius: 4, fontSize: 9, letterSpacing: 1, padding: "2px 7px", userSelect: "none" }}>
            {showImage ? "DATA ⟲" : "VIEW ⟲"}
          </span>
        )}
      </div>
      {selected ? (
        <>
          {showImage ? (
            <SatVisual id={visualId} color={accentColor} isMobile={true} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              {[
                ["NAME", selected.object_name], ["TYPE", selected.object_type],
                ["COUNTRY", selected.country_code], ["LAUNCHED", selected.launch_date],
                ["INCLINATION", selected.inclination ? `${selected.inclination}°` : "N/A"],
                ["APOAPSIS", selected.apoapsis ? `${Math.round(selected.apoapsis)} km` : "N/A"],
                ["PERIAPSIS", selected.periapsis ? `${Math.round(selected.periapsis)} km` : "N/A"],
                ["PERIOD", selected.period ? `${Math.round(selected.period)} min` : "N/A"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ color: `${C.cyan}88`, fontSize: 10, letterSpacing: 2 }}>{label}</div>
                  <div style={{ color: C.white, fontSize: 13, marginTop: 2 }}>{value || "N/A"}</div>
                </div>
              ))}
            </div>
          )}
          <div onClick={onDeselect} style={{ color: `${C.cyan}88`, fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center", padding: "10px 0", borderTop: `1px solid ${C.cyan}22`, marginTop: 14 }}>DESELECT</div>
        </>
      ) : (
        <div style={{ color: `${C.cyan}44`, fontSize: 11, letterSpacing: 1 }}>Tap a satellite on the globe to select it.</div>
      )}
    </>
  );
}
