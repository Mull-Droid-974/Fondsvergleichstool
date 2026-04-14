/**
 * Direct provider scraper.
 * Identifies the fund provider from ISIN prefix + known patterns,
 * then fetches factsheets directly from provider websites.
 *
 * ISIN country codes:
 *   CH = Switzerland (UBS, Swisscanto/ZKB, Julius Baer, Raiffeisen, Helvetia, Baloise…)
 *   LU = Luxembourg (DWS, Allianz GI, Amundi, Pictet, Lombard Odier, Nordea…)
 *   IE = Ireland (iShares/BlackRock, Vanguard, WisdomTree, SSGA…)
 *   DE = Germany (DWS, Union Investment, Deka…)
 *   FR = France (Amundi, AXA IM, BNP Paribas AM…)
 */
import { fetchHtml, fetchPdf, fetchJson, extractPdfLinksFromHtml } from "../utils"

// Provider detection by ISIN prefix (first 4 chars after country code)
// CH0012... = UBS, CH0018... = Swisscanto etc. — these are rough heuristics
const PROVIDER_BY_ISIN_PREFIX: Record<string, string> = {
  // Switzerland
  CH0012: "ubs",
  CH0031: "ubs",
  CH0027: "ubs",
  CH0018: "swisscanto",
  CH0222: "swisscanto",
  CH0224: "swisscanto",
  CH0219: "swisscanto",
  CH0011: "julius-baer",
  CH0016: "julius-baer",
  CH0017: "julius-baer",
  CH0029: "raiffeisen",
  CH0030: "raiffeisen",
  // Luxembourg — major providers
  LU0823: "ubs",
  LU0274: "ubs",
  LU0307: "credit-suisse",
  LU0119: "credit-suisse",
  LU0112: "pictet",
  LU0155: "pictet",
  LU0313: "pictet",
  LU0503: "blackrock",
  LU0011: "fidelity",
  LU0048: "fidelity",
  LU0251: "nordea",
  LU0141: "dws",
  LU0140: "dws",
}

async function scrapeUbs(isin: string): Promise<string | null> {
  // UBS Asset Management factsheets
  const urls = [
    `https://www.ubs.com/api/alternativedata/am/documents?isin=${isin}&documentType=FACTSHEET&language=en`,
    `https://www.ubs.com/global/en/asset-management/funds/fund-detail.${isin}.html`,
  ]
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json,text/html,*/*",
          Referer: "https://www.ubs.com/",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      })
      if (!response.ok) continue

      const ct = response.headers.get("content-type") ?? ""
      if (ct.includes("json")) {
        const data = await response.json()
        const docUrl =
          data?.documents?.[0]?.url ??
          data?.data?.[0]?.downloadUrl ??
          data?.[0]?.url
        if (docUrl) {
          const pdf = await fetchPdf(docUrl)
          if (pdf) {
            console.log(`[providers:ubs] Found via API: ${docUrl}`)
            return pdf
          }
        }
      } else if (ct.includes("html")) {
        const html = await response.text()
        const links = extractPdfLinksFromHtml(html, url)
          .filter((l) => l.toLowerCase().includes("factsheet"))
        for (const link of links.slice(0, 3)) {
          const pdf = await fetchPdf(link)
          if (pdf) {
            console.log(`[providers:ubs] Found via HTML: ${link}`)
            return pdf
          }
        }
      }
    } catch {}
  }
  return null
}

async function scrapeSwisscanto(isin: string): Promise<string | null> {
  const urls = [
    `https://www.swisscanto.com/api/fund/documents?isin=${isin}&type=factsheet&lang=en`,
    `https://www.swisscanto.com/ch/en/investment-funds/fund-details/${isin}/documents.html`,
  ]
  for (const url of urls) {
    const html = await fetchHtml(url)
    if (!html) continue
    // Try JSON parse first
    try {
      const data = JSON.parse(html)
      const docUrl = data?.url ?? data?.downloadUrl ?? data?.[0]?.url
      if (docUrl) {
        const pdf = await fetchPdf(docUrl)
        if (pdf) { console.log(`[providers:swisscanto] ${docUrl}`); return pdf }
      }
    } catch {}
    // Try HTML
    const links = extractPdfLinksFromHtml(html, url)
      .filter((l) => l.toLowerCase().includes("factsheet") || l.toLowerCase().includes("fact"))
    for (const link of links.slice(0, 3)) {
      const pdf = await fetchPdf(link)
      if (pdf) { console.log(`[providers:swisscanto] ${link}`); return pdf }
    }
  }
  return null
}

async function scrapePictet(isin: string): Promise<string | null> {
  const url = `https://www.pictet.com/ch/en/funds/${isin.toLowerCase()}`
  const html = await fetchHtml(url)
  if (!html) return null
  const links = extractPdfLinksFromHtml(html, url)
    .filter((l) => l.toLowerCase().includes("factsheet"))
  for (const link of links.slice(0, 3)) {
    const pdf = await fetchPdf(link)
    if (pdf) { console.log(`[providers:pictet] ${link}`); return pdf }
  }
  return null
}

async function scrapeBlackrock(isin: string): Promise<string | null> {
  // iShares / BlackRock
  const apiUrl = `https://www.blackrock.com/tools/hackathon/literature?isin=${isin}&type=factsheet&fileType=pdf&countryCode=ch&language=en`
  const data = await fetchJson<{ literatureDocuments?: { downloadURL?: string }[] }>(
    apiUrl, { Referer: "https://www.ishares.com/" }
  )
  const docUrl = data?.literatureDocuments?.[0]?.downloadURL
  if (docUrl) {
    const pdf = await fetchPdf(docUrl)
    if (pdf) { console.log(`[providers:blackrock] ${docUrl}`); return pdf }
  }

  // iShares direct
  const iSharesUrl = `https://www.ishares.com/ch/individual/en/literature/fact-sheet/${isin}.pdf`
  const pdf2 = await fetchPdf(iSharesUrl)
  if (pdf2) { console.log(`[providers:ishares-direct] ${iSharesUrl}`); return pdf2 }

  return null
}

async function scrapeFidelity(isin: string): Promise<string | null> {
  const url = `https://www.fidelity.ch/api/fund/documents?isin=${isin}&type=FACTSHEET&lang=en`
  const data = await fetchJson<{ documents?: { url?: string }[] }>(url, {
    Referer: "https://www.fidelity.ch/",
  })
  const docUrl = data?.documents?.[0]?.url
  if (docUrl) {
    const pdf = await fetchPdf(docUrl)
    if (pdf) { console.log(`[providers:fidelity] ${docUrl}`); return pdf }
  }
  return null
}

async function scrapeDws(isin: string): Promise<string | null> {
  const url = `https://api.dws.com/funddata/factsheet?isin=${isin}&lang=en&country=CH`
  const data = await fetchJson<{ factsheetUrl?: string }>(url, {
    Referer: "https://www.dws.com/",
  })
  if (data?.factsheetUrl) {
    const pdf = await fetchPdf(data.factsheetUrl)
    if (pdf) { console.log(`[providers:dws] ${data.factsheetUrl}`); return pdf }
  }
  return null
}

// Generic fallback: try common provider document CDN patterns
async function scrapeGenericPatterns(isin: string): Promise<string | null> {
  const patterns = [
    `https://doc.morningstar.com/SourceData/CH/${isin}/factsheet_EN.pdf`,
    `https://www.justetf.com/api/etfs/${isin}/documents/latest/factsheet/en`,
    `https://etf.dws.com/api/factsheet/${isin}/en`,
  ]
  for (const url of patterns) {
    const pdf = await fetchPdf(url)
    if (pdf) { console.log(`[providers:generic] ${url}`); return pdf }
  }
  return null
}

const PROVIDER_SCRAPERS: Record<string, (isin: string) => Promise<string | null>> = {
  "ubs": scrapeUbs,
  "swisscanto": scrapeSwisscanto,
  "pictet": scrapePictet,
  "blackrock": scrapeBlackrock,
  "ishares": scrapeBlackrock,
  "fidelity": scrapeFidelity,
  "dws": scrapeDws,
}

export async function scrapeFromProvider(isin: string): Promise<string | null> {
  console.log(`[providers] Starting provider scrape for ${isin}`)

  // Detect provider from ISIN prefix
  const prefix = isin.slice(0, 6)
  const provider = PROVIDER_BY_ISIN_PREFIX[prefix]

  if (provider) {
    console.log(`[providers] Detected provider: ${provider} for prefix ${prefix}`)
    const scraper = PROVIDER_SCRAPERS[provider]
    if (scraper) {
      const result = await scraper(isin)
      if (result) return result
    }
  }

  // Try generic patterns regardless
  const generic = await scrapeGenericPatterns(isin)
  if (generic) return generic

  console.log(`[providers] All provider attempts failed for ${isin}`)
  return null
}
