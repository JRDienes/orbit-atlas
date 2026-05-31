// Central color palette and font for the whole UI.
// Change the look from one place. Alpha variants are built with template
// literals at call sites, e.g. `${COLORS.cyan}55` for a translucent cyan.
export const COLORS = {
  cyan: "#00d4ff",      // primary accent / HUD
  bg: "#020818",        // dark background
  gold: "#FFD700",      // ISS tracker
  green: "#00ff88",     // secondary accent
  white: "#ffffff",
  toggleOff: "#1a1a2e", // inactive toggle track
};

export const FONT = "'Courier New', monospace";
