/**
 * Scraper for fundinfo.com factsheets.
 * Uses stealth HTTP headers to simulate a professional investor browser session.
 * Returns the PDF as a base64 string, or throws on failure.
 */

const STEALTH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/pdf,application/octet-stream,*/*",
  "Accept-Language": "de-CH,de;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.fundinfo.com/",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
}

// Fundinfo URL patterns for CH domicile, English factsheet
const FACTSHEET_URL_PATTERNS = [
  (isin: string) =>
    `https://www.fundinfo.com/api/fund/factsheet/${isin}?language=en&domicile=CH`,
  (isin: string) =>
    `https://www.fundinfo.com/de-ch/funds/${isin.toLowerCase()}/overview`,
]

export interface ScraperResult {
  success: boolean
  pdfBase64?: string
  sourceUrl?: string
  error?: string
}

/**
 * Attempts to download a factsheet PDF from fundinfo.com for a given ISIN.
 */
export async function scrapeFundinfo(isin: string): Promise<ScraperResult> {
  // Try direct PDF URL first
  const directUrl = `https://www.fundinfo.com/api/fund/factsheet/${isin}?language=en&domicile=CH`

  try {
    const response = await fetch(directUrl, {
      headers: STEALTH_HEADERS,
      signal: AbortSignal.timeout(15000),
    })

    if (
      response.ok &&
      response.headers.get("content-type")?.includes("pdf")
    ) {
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")
      return { success: true, pdfBase64: base64, sourceUrl: directUrl }
    }

    // Try alternate URL pattern: search page to find document link
    const searchUrl = `https://www.fundinfo.com/api/v1/search?query=${isin}&type=fund`
    const searchResponse = await fetch(searchUrl, {
      headers: STEALTH_HEADERS,
      signal: AbortSignal.timeout(10000),
    })

    if (searchResponse.ok) {
      const data = await searchResponse.json()
      const fund = data?.results?.[0]
      if (fund?.factsheetUrl) {
        const pdfResponse = await fetch(fund.factsheetUrl, {
          headers: STEALTH_HEADERS,
          signal: AbortSignal.timeout(15000),
        })
        if (pdfResponse.ok) {
          const buffer = await pdfResponse.arrayBuffer()
          const base64 = Buffer.from(buffer).toString("base64")
          return {
            success: true,
            pdfBase64: base64,
            sourceUrl: fund.factsheetUrl,
          }
        }
      }
    }

    return {
      success: false,
      error: `Fundinfo returned status ${response.status}. Bitte Factsheet manuell hochladen.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler"
    return {
      success: false,
      error: `Scraping fehlgeschlagen: ${message}. Bitte Factsheet manuell hochladen.`,
    }
  }
}
