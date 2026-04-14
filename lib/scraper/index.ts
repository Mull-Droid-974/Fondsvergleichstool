/**
 * Multi-source factsheet scraper.
 * Tries sources in priority order:
 *   1. fundinfo.com  (primary aggregator for CH/LU funds)
 *   2. swissfunddata.ch  (Swiss regulatory registry)
 *   3. Morningstar  (international coverage)
 *   4. Direct provider  (UBS, Swisscanto, BlackRock, etc.)
 */
import { scrapeFundinfo } from "./sources/fundinfo"
import { scrapeSwissFundData } from "./sources/swissfund"
import { scrapeMorningstar } from "./sources/morningstar"
import { scrapeFromProvider } from "./sources/providers"

export interface ScraperResult {
  success: boolean
  pdfBase64?: string
  sourceUrl?: string
  source?: string
  error?: string
}

const SOURCES: { name: string; fn: (isin: string) => Promise<string | null> }[] = [
  { name: "fundinfo.com", fn: scrapeFundinfo },
  { name: "swissfunddata.ch", fn: scrapeSwissFundData },
  { name: "morningstar", fn: scrapeMorningstar },
  { name: "provider-direct", fn: scrapeFromProvider },
]

export async function scrapeFactsheet(isin: string): Promise<ScraperResult> {
  console.log(`[scraper] Attempting factsheet download for ${isin}`)

  for (const source of SOURCES) {
    try {
      console.log(`[scraper] Trying source: ${source.name}`)
      const pdfBase64 = await source.fn(isin)
      if (pdfBase64) {
        console.log(`[scraper] SUCCESS via ${source.name} for ${isin}`)
        return {
          success: true,
          pdfBase64,
          source: source.name,
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[scraper] Error in ${source.name}: ${msg}`)
    }
  }

  console.log(`[scraper] All sources failed for ${isin}`)
  return {
    success: false,
    error:
      `Factsheet für ${isin} konnte nicht automatisch heruntergeladen werden ` +
      `(fundinfo.com, swissfunddata.ch, Morningstar und Direktanbieter ohne Ergebnis). ` +
      `Bitte Factsheet manuell hochladen.`,
  }
}
