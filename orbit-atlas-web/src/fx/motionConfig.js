// ── Motion control board ────────────────────────────────────────────────
// Every animation system reads its on/off switch and tunables from here, so
// each can be toggled or re-timed independently without touching the systems
// themselves. Guiding principle: restraint — at any moment ONE thing is the
// focal animation; ambient layers stay quiet and never peak together (their
// periods are deliberately co-prime-ish so the peaks drift apart).
// Users who opt out of motion at the OS level get a still scene: ambient
// layers and the auto-scan check this before animating.
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const MOTION = {
  // Header status signals (LIVE dot, UTC clock, sync ping, counter ticks)
  headerSignals: true,

  // Empty-state fills (idle dashboard, rotating tips, category chips)
  emptyStates: true,

  // Reactive micro-interactions (hover glows, press states, tooltips)
  reactive: {
    enabled: true,
    categoryPulseMs: 1000, // how long a hovered filter group glows on the globe
  },

  // Ambient living layers — max 3 active by design (terminator omitted to
  // honor that cap). Radar sweep + atmosphere breathing are OFF per design
  // review: the constant pulse off the Earth read as busy. Flip back here.
  ambient: {
    radarSweep: { enabled: false, periodMs: 6000, maxScale: 2.4, baseOpacity: 0.16 },
    atmosphereBreath: { enabled: false, periodMs: 7300, amplitude: 0.3 }, // ±30% of base opacity when on
    satGlowCycle: { enabled: true, dwellMs: 8600, pulseMs: 2150 }, // one sat at a time
  },

  // Ambient auto-scan (the centerpiece)
  autoScan: {
    enabled: true,
    idleMs: 4000,        // idle time before scan starts
    cycleMs: 4000,       // time between target acquisitions
    lockMs: 150,         // reticle scale-in
    decodeMs: 280,       // label scramble→resolve
    displayMs: 2000,     // hold on target
    releaseMs: 180,      // fade-out
    rotationSpeed: 0.00022, // slow weighted auto-rotation (rad/frame @60fps)
  },

  // Click/select cinematics
  select: {
    arcMs: 200,          // globe arc to bring target front-and-center
    rowStaggerMs: 20,    // object-data row cadence
    countUpMs: 400,      // numeric count-up duration
    dimOthers: 0.3,      // brightness multiplier for non-selected sats
    travelGlow: true,    // bright point traveling the selected orbit
  },
};
