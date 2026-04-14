/**
 * Format a percentage with up to 2 decimal places.
 * Returns "—" for null/undefined.
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(decimals)}%`
}

/**
 * Format Assets under Management in billions.
 */
export function formatAum(
  aum: number | null | undefined,
  currency = "EUR"
): string {
  if (aum === null || aum === undefined) return "—"
  if (aum >= 1) {
    return `${currency} ${aum.toFixed(1)} Mrd.`
  }
  return `${currency} ${(aum * 1000).toFixed(0)} Mio.`
}

/**
 * Format a date string to localized DE format.
 */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return dateStr
  }
}

/**
 * Format SFDR article number with display label.
 */
export function formatSfdrArticle(article: 6 | 8 | 9 | null): string {
  if (article === null || article === undefined) return "—"
  const labels: Record<number, string> = {
    6: "Art. 6 (Grau)",
    8: "Art. 8 (Hellgrün)",
    9: "Art. 9 (Dunkelgrün)",
  }
  return labels[article] ?? "—"
}

/**
 * Get SFDR article color for badges.
 */
export function getSfdrColor(
  article: 6 | 8 | 9 | null
): "default" | "secondary" | "destructive" {
  if (article === 9) return "default" // green
  if (article === 8) return "secondary" // light
  return "destructive" // grey/default
}

/**
 * Format confidence score as a human-readable label.
 */
export function formatConfidence(score: number | undefined): string {
  if (score === undefined) return "—"
  if (score >= 0.85) return "Hoch"
  if (score >= 0.6) return "Mittel"
  return "Niedrig"
}
