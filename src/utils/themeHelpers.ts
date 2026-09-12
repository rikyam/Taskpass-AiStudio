/**
 * Theme & Color utility helpers for UI Modes (Graphics & Text modes)
 */

export const isColorLight = (hex?: string): boolean => {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return false;
  let c = hex.substring(1).trim();
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return false;
  const num = parseInt(c, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};
