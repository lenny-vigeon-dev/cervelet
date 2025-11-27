/**
 * Official r/place palette (32 colors)
 * Organized in 4 rows of 8 colors
 */
export const COLOR_PALETTE = [
  // Row 1
  "#6d001a", "#be0039", "#ff4500", "#ffa800",
  "#ffd635", "#fff8b8", "#00a368", "#00cc78",
  // Row 2
  "#7eed56", "#00756f", "#009eaa", "#00ccc0",
  "#2450a4", "#3690ea", "#51e9f4", "#493ac1",
  // Row 3
  "#6a5cff", "#94b3ff", "#811e9f", "#b44ac0",
  "#e4abff", "#de107f", "#ff3881", "#ff99aa",
  // Row 4
  "#6d482f", "#9c6926", "#ffb470", "#000000",
  "#515252", "#898d90", "#d4d7d9", "#ffffff",
] as const;

export type ColorPalette = typeof COLOR_PALETTE[number];
