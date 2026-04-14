/**
 * fundinfo.com scraper.
 * Tries multiple known API patterns to find and download factsheet PDFs.
 */
import { fetchJson, fetchPdf, fetchHtml, extractPdfLinksFromHtml, JSON_HEADERS } from "../utils"

const BASE = "https://www.fundinfo.com"

interface FundinfoDocument {
  url?: string
  downloadUrl?: string
  documentUrl?: string
  type?: string
  documentType?: string
  name?: string
}

interface FundinfoSearchResult {
  id?: string
  isin?: string
  documents?: FundinfoDocument[]
  factsheetUrl?: string
}

export async function scrapeFundinfo(isin: string): Promise<string | null> {
  console.log(`[fundinfo] Starting scrape for ${isin}`)

  // --- Attempt 1: Public documents API (v2) ---
  const apiV2 = `${BASE}/api/v2/fund-documents?isin=${isin}&country=CH&language=en&type=FACTSHEET`
  const docsV2 = await fetchJson<FundinfoDocument[]>(apiV2, {
    Referer: `${BASE}/en-ch/funds/${isin.toLowerCase()}/`,
  })
  if (docsV2 && Array.isArray(docsV2) && docsV2.length > 0) {
    for (const doc of docsV2) {
      const url = doc.downloadUrl ?? doc.url ?? doc.documentUrl
      if (url) {
        console.log(`[fundinfo] v2 API found doc URL: ${url}`)
        const pdf = await fetchPdf(url)
        if (pdf) return pdf
      }
    }
  }

  // --- Attempt 2: Public API v1 search ---
  const searchUrl = `${BASE}/api/v1/search?query=${isin}&type=fund&lang=en`
  const searchResult = await fetchJson<{ results?: FundinfoSearchResult[] }>(
    searchUrl,
    { Referer: BASE }
  )
  if (searchResult?.results?.length) {
    const fund = searchResult.results[0]
    if (fund.factsheetUrl) {
      console.log(`[fundinfo] v1 search factsheetUrl: ${fund.factsheetUrl}`)
      const pdf = await fetchPdf(fund.factsheetUrl)
      if (pdf) return pdf
    }
  }

  // --- Attempt 3: Fund detail page HTML → extract PDF links ---
  const detailUrl = `${BASE}/en-ch/funds/${isin.toLowerCase()}/documents`
  const html = await fetchHtml(detailUrl)
  if (html) {
    const links = extractPdfLinksFromHtml(html, detailUrl)
    const factsheetLinks = links.filter(
      (l) =>
        l.toLowerCase().includes("factsheet") ||
        l.toLowerCase().includes("fund-sheet") ||
        l.toLowerCase().includes("kiid") ||
        l.toLowerCase().includes("kid")
    )
    console.log(`[fundinfo] HTML page found ${factsheetLinks.length} PDF links`)
    for (const link of factsheetLinks.slice(0, 3)) {
      const pdf = await fetchPdf(link)
      if (pdf) {
        console.log(`[fundinfo] Downloaded PDF from HTML link: ${link}`)
        return pdf
      }
    }
    // Try any PDF link as fallback
    for (const link of links.slice(0, 5)) {
      const pdf = await fetchPdf(link)
      if (pdf) {
        console.log(`[fundinfo] Downloaded PDF from generic link: ${link}`)
        return pdf
      }
    }
  }

  // --- Attempt 4: Assets CDN direct patterns ---
  const cdnPatterns = [
    `https://assets.fundinfo.com/${isin}/factsheet_en.pdf`,
    `https://assets.fundinfo.com/${isin}/factsheet_de.pdf`,
    `https://assets.fundinfo.com/documents/${isin}/factsheet.pdf`,
  ]
  for (const url of cdnPatterns) {
    const pdf = await fetchPdf(url)
    if (pdf) {
      console.log(`[fundinfo] CDN pattern worked: ${url}`)
      return pdf
    }
  }

  console.log(`[fundinfo] All attempts failed for ${isin}`)
  return null
}
