import { LUNAR_SITES, LUNAR_ORBITERS } from "../utils/lunarData";
import CollapsibleSection from "./CollapsibleSection";
import { COLORS as C } from "../theme";

// ── MOON scope side panel ────────────────────────────────────────────────
// Replaces the Earth-centric panels while the Moon is the active body.
// Landing sites: click a row to fly the globe to that site (same decisive
// arc as satellite selection). Orbiters: the live spacecraft circling the
// Moon, color-matched to their rings in the scene.
export default function LunarPanel({ onFlyToSite }) {
  return (
    <div onWheel={e => e.stopPropagation()} className="hud-card" style={{ position: "absolute", top: 80, right: 20, width: 300, bottom: 150, background: `${C.bg}cc`, border: `1px solid ${C.cyan}33`, borderRadius: 8, backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <CollapsibleSection title="LANDING SITES" openFlex={7} style={{ padding: "14px 14px 0" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 6, marginTop: 10 }}>
          {LUNAR_SITES.map((site, i) => (
            <div key={site.name} onClick={() => onFlyToSite(site)}
              className="hud-row hud-accent-row hud-row-in"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderBottom: `1px solid ${C.cyan}0d`, cursor: "pointer", borderRadius: 3, color: C.green, animationDelay: `${i * 20}ms` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}88`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#ccd", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.name}</div>
                <div style={{ color: `${C.cyan}55`, fontSize: 9, letterSpacing: 1 }}>{site.org} · {site.type}</div>
              </div>
              <div style={{ color: `${C.cyan}77`, fontSize: 11, flexShrink: 0 }}>{site.year}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <div style={{ borderTop: `1px solid ${C.cyan}22`, flexShrink: 0 }} />

      <CollapsibleSection title="LUNAR ORBITERS" openFlex={3} style={{ padding: "16px 14px" }}>
        <div style={{ flex: 1, overflowY: "auto", marginTop: 10 }}>
          {LUNAR_ORBITERS.map((o, i) => (
            <div key={o.name} className="hud-row-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px", animationDelay: `${i * 20}ms` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: o.color, boxShadow: `0 0 5px ${o.color}`, flexShrink: 0 }} />
              <div style={{ color: "#ccd", fontSize: 12, flex: 1 }}>{o.name}</div>
              <div style={{ color: `${C.cyan}66`, fontSize: 10 }}>{o.alt} KM · {o.inclination}°</div>
            </div>
          ))}
          <div style={{ color: `${C.cyan}33`, fontSize: 9, letterSpacing: 1, marginTop: 10, lineHeight: 1.6 }}>
            POLAR MAPPING ORBITS · POSITIONS ADVANCE WITH SIM TIME
          </div>
        </div>
      </CollapsibleSection>

    </div>
  );
}
