export function normalizeTitle(title) {
  if (!title) return "";

  return title
    .toLowerCase()
    .replace(/\(.*\)/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(3d|2d|imax|4dx|nd|st|th)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
