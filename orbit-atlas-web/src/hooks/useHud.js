import { useEffect, useRef, useState } from "react";

// ── Small shared hooks for the HUD motion layer ─────────────────────────

// Ticking UTC clock, updates once per second. Intended feel: a quiet,
// always-moving signal that the system is alive — monospace, no drama.
export function useUtcClock(enabled = true) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now.toUTCString().slice(17, 25); // "HH:MM:SS"
}

// Animates a displayed number toward `target` with a 400ms ease-out ramp.
// Used by the header object counter and the object-data readout so values
// count up rather than snap — instrumentation, not a spreadsheet.
// `startAt` (optional) makes the first render begin from that value — e.g. 0
// so a freshly-mounted readout counts up to its target.
export function useCountUp(target, duration = 400, startAt) {
  const initial = startAt !== undefined ? startAt : target;
  const [display, setDisplay] = useState(initial);
  const fromRef = useRef(initial);
  const rafRef = useRef(null);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const v = from + (target - from) * eased;
      setDisplay(p < 1 ? v : target);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return display;
}

const DECODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&";

// Scramble-then-resolve text effect (<300ms). Characters lock in left to
// right so the eye reads it as a decode, not noise. Used ONLY on the
// Object Data name and auto-scan labels — overuse kills the effect.
export function useDecodeText(text, duration = 280, enabled = true) {
  const [display, setDisplay] = useState(text || "");
  useEffect(() => {
    if (!enabled || !text) { setDisplay(text || ""); return; }
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const lockCount = Math.floor(p * text.length);
      let out = text.slice(0, lockCount);
      for (let i = lockCount; i < text.length; i++) {
        out += text[i] === " " ? " " : DECODE_CHARS[(Math.random() * DECODE_CHARS.length) | 0];
      }
      setDisplay(out);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, enabled]);
  return display;
}
