import { COLORS as C } from "../theme";

// Floating "reset everything" pill, centered below the header so it's easy to
// find. Appears only when there's something to reset. Lights up on hover/press.
export default function ResetButton({ show, isMobile, onReset }) {
  const base = { background: `${C.bg}cc`, borderColor: `${C.cyan}3a`, color: `${C.cyan}cc`, boxShadow: "0 4px 16px #0007", transform: "scale(1)" };
  const hover = { background: `${C.cyan}1c`, borderColor: C.cyan, color: C.cyan, boxShadow: `0 0 20px ${C.cyan}55, 0 4px 16px #0007`, transform: "scale(1)" };
  const press = { background: `${C.cyan}33`, borderColor: C.cyan, color: C.white, boxShadow: `0 0 28px ${C.cyan}99, 0 4px 16px #0007`, transform: "scale(0.95)" };
  const set = (e, s) => Object.assign(e.currentTarget.style, s);

  return (
    <div style={{
      position: "fixed", top: isMobile ? 84 : 104, left: "50%", zIndex: 450,
      transform: `translateX(-50%) translateY(${show ? 0 : -10}px)`,
      opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none",
      transition: "opacity 0.2s ease, transform 0.2s ease",
    }}>
      <div onClick={onReset} title="Reset all filters & selections"
        onMouseEnter={e => set(e, hover)}
        onMouseLeave={e => set(e, base)}
        onMouseDown={e => set(e, press)}
        onMouseUp={e => set(e, hover)}
        onTouchStart={e => set(e, press)}
        onTouchEnd={e => set(e, base)}
        style={{
          ...base, cursor: "pointer",
          border: "1px solid", borderRadius: 22,
          padding: isMobile ? "7px 22px" : "9px 28px",
          backdropFilter: "blur(8px)",
          fontSize: isMobile ? 11 : 12, letterSpacing: 3, fontWeight: "bold",
          transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease",
        }}>
        RESET
      </div>
    </div>
  );
}
