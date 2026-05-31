import { CATEGORIES, CATEGORY_CODES } from "../utils/constants";
import { COLORS as C } from "../theme";

// Country-code chips, grouped by active category. Desktop renders inside the
// left card's scroll region; mobile renders inside the bottom sheet. The chip
// toggle logic lives in App (passed as `onToggleCode`) since it also manages the
// focused-codes drill-down state shared with the satellite viewer.
export default function CountryCodesPanel({ isMobile, active, selectedCodes, sats, onToggleCode, onReset }) {
  const groups = active.map(catId => {
    const cat = CATEGORIES.find(c => c.id === catId);
    const codes = catId === "rest_of_world"
      ? [...new Set(sats.filter(s => s.category === "rest_of_world" && s.country_code).map(s => s.country_code))].sort()
      : (CATEGORY_CODES[catId] || []);
    if (!cat) return null;
    return (
      <div key={catId} style={{ marginBottom: isMobile ? 14 : 12 }}>
        <div style={{ color: cat.color, fontSize: 10, letterSpacing: 1, marginBottom: isMobile ? 6 : 5 }}>{cat.label.toUpperCase()}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 5 : 3 }}>
          {codes.map(code => {
            const isSelected = selectedCodes.includes(code);
            const isDimmed = codes.filter(c => selectedCodes.includes(c)).length > 0 && !isSelected;
            const base = { background: isSelected ? `${cat.color}44` : `${cat.color}18`, border: `1px solid ${isSelected ? cat.color : `${cat.color}44`}`, color: isSelected ? cat.color : `${cat.color}cc`, letterSpacing: 1, cursor: "pointer", opacity: isDimmed ? 0.35 : 1 };
            const style = isMobile
              ? { ...base, borderRadius: 4, fontSize: 11, padding: "4px 8px" }
              : { ...base, borderRadius: 3, fontSize: 9, padding: "2px 5px", transition: "opacity 0.15s, background 0.15s" };
            return (
              <span key={code} onClick={() => onToggleCode(code, catId)} style={style}>{code}</span>
            );
          })}
        </div>
      </div>
    );
  });

  if (isMobile) {
    return (
      <>
        <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3, marginBottom: 12 }}>COUNTRY CODES</div>
        {active.length === 0 && <div style={{ color: `${C.cyan}44`, fontSize: 11, letterSpacing: 1 }}>Enable a filter category to see its country codes.</div>}
        {groups}
        {selectedCodes.length > 0 && (
          <div onClick={onReset} style={{ color: `${C.cyan}88`, fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center", padding: "10px 0", borderTop: `1px solid ${C.cyan}22`, marginTop: 4 }}>RESET CODE FILTER</div>
        )}
      </>
    );
  }

  return (
    <>
      <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 3, marginBottom: 12, flexShrink: 0 }}>COUNTRY CODES</div>
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {groups}
        {selectedCodes.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.cyan}22`, marginTop: 8, paddingTop: 10 }}>
            <div onClick={onReset} style={{ color: `${C.cyan}88`, fontSize: 11, letterSpacing: 2, cursor: "pointer", textAlign: "center" }}>RESET CODE FILTER</div>
          </div>
        )}
      </div>
    </>
  );
}
