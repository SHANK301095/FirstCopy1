/**
 * Sanitize user text for safe display
 * Ensures all values are converted to strings safely
 */
export function safeText(s: unknown): string {
  return String(s ?? "");
}

/**
 * Prevent CSV formula injection
 * Prefix cells starting with =, +, -, @ with single quote
 * This prevents Excel/Sheets from interpreting them as formulas
 */
export function safeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
