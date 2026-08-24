/** Convert "First Middle Last" → "Last, First Middle".
 * Already-formatted names (containing a comma) are returned as-is.
 */
export function formatSurnameFirst(name: string) {
  const trimmed = String(name || "").trim();
  if (!trimmed || trimmed.includes(",")) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, parts.length - 1).join(" ");
  return `${last}, ${rest}`;
}
