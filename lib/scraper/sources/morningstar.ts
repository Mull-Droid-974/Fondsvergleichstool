/**
 * Morningstar scraper.
 * Uses Morningstar's search to find fund IDs, then fetches document links.
 */
import { fetchJson, fetchHtml, fetchPdf, extractPdfLinksFromHtml } from "../utils"

interface MsSearchHit {
  id?: string
  SecId?: string
  isin?: string
  ticker?: string
  exchange?: string
}

export async function scrapeMorningstar(isin: string): Promise<string | null> {
  console.log(`[morningstar] Starting scrape for ${isin}`)

  // --- Attempt 1: Morningstar security search (UK endpoint — more permissive) ---
  const searchUrl = `https://www.morningstar.co.uk/uk/util/SecuritySearch.ashx?term=${isin}&limit=1&lang=en`
  const searchResult = await fetchJson<MsSearchHit[]>(searchUrl, {
    Referer: "https://www.morningstar.co.uk/",
  })

  let msId: string | null = null
  if (Array.isArray(searchResult) && searchResult.length > 0) {
    msId = searchResult[0].SecId ?? searchResult[0].id ?? null
    console.log(`[morningstar] Found SecId: ${msId}`)
  }

  // --- Attempt 2: CH endpoint search ---
  if (!msId) {
    const chSearch = `https://www.morningstar.ch/ch/util/SecuritySearch.ashx?term=${isin}&limit=1&lang=de`
    const chResult = await fetchJson<MsSearchHit[]>(chSearch, {
      Referer: "https://www.morningstar.ch/",
    })
    if (Array.isArray(chResult) && chResult.length > 0) {
      msId = chResult[0].SecId ?? chResult[0].id ?? null
      console.log(`[morningstar] Found SecId via CH: ${msId}`)
    }
  }

  if (msId) {
    // --- Attempt 3: Fund documents page ---
    const docUrls = [
      `https://www.morningstar.co.uk/uk/funds/snapshot/snapshot.aspx?id=${msId}&tab=4`,
      `https://www.morningstar.ch/ch/funds/snapshot/snapshot.aspx?id=${msId}&tab=4`,
    ]
    for (const docUrl of docUrls) {
      const html = await fetchHtml(docUrl)
      if (html) {
        const links = extractPdfLinksFromHtml(html, docUrl)
        const factsheetLinks = links.filter(
          (l) =>
            l.toLowerCase().includes("factsheet") ||
            l.toLowerCase().includes("kiid") ||
            l.toLowerCase().includes("kid") ||
            l.toLowerCase().includes("prospectus") === false
        )
        console.log(`[morningstar] Found ${factsheetLinks.length} factsheet links`)
        for (const link of factsheetLinks.slice(0, 3)) {
          const pdf = await fetchPdf(link)
          if (pdf) {
            console.log(`[morningstar] Downloaded: ${link}`)
            return pdf
          }
        }
      }
    }

    // --- Attempt 4: Morningstar document API ---
    const docApiUrl = `https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener?field=SecId,Name,ISIN,DocumentUrl&id=${msId}`
    const docApi = await fetchJson<{ rows?: { DocumentUrl?: string }[] }>(
      docApiUrl,
      { Referer: "https://www.morningstar.co.uk/" }
    )
    const docUrl = docApi?.rows?.[0]?.DocumentUrl
    if (docUrl) {
      const pdf = await fetchPdf(docUrl)
      if (pdf) {
        console.log(`[morningstar] Doc API URL worked: ${docUrl}`)
        return pdf
      }
    }
  }

  console.log(`[morningstar] All attempts failed for ${isin}`)
  return null
}
