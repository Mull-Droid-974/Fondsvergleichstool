/**
 * swissfunddata.ch scraper (Swiss Funds & Asset Management Association).
 * Public Swiss fund registry — often accessible without bot protection.
 */
import { fetchHtml, fetchJson, fetchPdf, extractPdfLinksFromHtml } from "../utils"

const BASE = "https://www.swissfunddata.ch"

export async function scrapeSwissFundData(isin: string): Promise<string | null> {
  console.log(`[swissfund] Starting scrape for ${isin}`)

  // --- Attempt 1: ISIN search API ---
  const searchUrl = `${BASE}/sfdpub/api/funds?isin=${isin}&lang=en`
  const apiResult = await fetchJson<{ funds?: { id?: string; isin?: string }[] }>(
    searchUrl,
    { Referer: BASE }
  )

  let fundId: string | null = null

  if (apiResult?.funds?.length) {
    fundId = apiResult.funds[0].id ?? null
    console.log(`[swissfund] Found fund ID via API: ${fundId}`)
  }

  // --- Attempt 2: HTML search page ---
  if (!fundId) {
    const searchPageUrl = `${BASE}/sfdpub/en/funds?search=${isin}`
    const html = await fetchHtml(searchPageUrl)
    if (html) {
      // Extract fund ID from URL patterns like /sfdpub/en/funds/12345/
      const idMatch = html.match(/\/sfdpub\/en\/funds\/(\d+)\//)
      if (idMatch) {
        fundId = idMatch[1]
        console.log(`[swissfund] Found fund ID via HTML: ${fundId}`)
      }
    }
  }

  if (fundId) {
    // --- Attempt 3: Fund detail page PDF links ---
    const detailUrl = `${BASE}/sfdpub/en/funds/${fundId}/documents`
    const html = await fetchHtml(detailUrl)
    if (html) {
      const links = extractPdfLinksFromHtml(html, detailUrl)
      console.log(`[swissfund] Found ${links.length} PDF links on detail page`)
      for (const link of links.slice(0, 5)) {
        const pdf = await fetchPdf(link)
        if (pdf) {
          console.log(`[swissfund] Downloaded PDF: ${link}`)
          return pdf
        }
      }
    }

    // --- Attempt 4: Direct document URL patterns ---
    const patterns = [
      `${BASE}/sfdpub/documents/${fundId}/factsheet_en.pdf`,
      `${BASE}/sfdpub/documents/${fundId}/factsheet.pdf`,
      `${BASE}/sfdpub/api/funds/${fundId}/factsheet?lang=en`,
    ]
    for (const url of patterns) {
      const pdf = await fetchPdf(url)
      if (pdf) {
        console.log(`[swissfund] Direct pattern worked: ${url}`)
        return pdf
      }
    }
  }

  // --- Attempt 5: Direct ISIN-based patterns ---
  const directPatterns = [
    `${BASE}/sfdpub/documents/${isin}/factsheet.pdf`,
    `${BASE}/sfdpub/en/funds/${isin}/factsheet`,
  ]
  for (const url of directPatterns) {
    const pdf = await fetchPdf(url)
    if (pdf) {
      console.log(`[swissfund] ISIN-direct pattern worked: ${url}`)
      return pdf
    }
  }

  console.log(`[swissfund] All attempts failed for ${isin}`)
  return null
}
