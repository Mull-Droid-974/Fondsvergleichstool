export const STEALTH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "de-CH,de;q=0.9,en-GB;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
}

export const JSON_HEADERS = {
  ...STEALTH_HEADERS,
  Accept: "application/json, text/plain, */*",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
}

export const PDF_HEADERS = {
  ...STEALTH_HEADERS,
  Accept: "application/pdf,application/octet-stream,*/*",
}

/** Returns true if the HTTP response content-type indicates a PDF. */
export function isPdfResponse(response: Response): boolean {
  const ct = response.headers.get("content-type") ?? ""
  return ct.includes("pdf") || ct.includes("octet-stream")
}

/** Validates that an ArrayBuffer starts with the PDF magic bytes %PDF */
export function isValidPdfBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4))
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46    // F
  )
}

/** Fetches a URL and returns the PDF as base64, or null if not a valid PDF. */
export async function fetchPdf(
  url: string,
  extraHeaders: Record<string, string> = {},
  timeoutMs = 15000
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { ...PDF_HEADERS, ...extraHeaders },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    })
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    if (!isValidPdfBuffer(buffer)) return null
    return Buffer.from(buffer).toString("base64")
  } catch {
    return null
  }
}

/** Fetches a URL and returns parsed JSON, or null on any error. */
export async function fetchJson<T>(
  url: string,
  extraHeaders: Record<string, string> = {},
  timeoutMs = 10000
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { ...JSON_HEADERS, ...extraHeaders },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

/** Fetches HTML content as text, or null on error. */
export async function fetchHtml(
  url: string,
  timeoutMs = 10000
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: STEALTH_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

/** Extract all PDF href/src links from an HTML page. */
export function extractPdfLinksFromHtml(
  html: string,
  baseUrl: string
): string[] {
  const links: string[] = []
  const patterns = [
    /href="([^"]+\.pdf[^"]*)"/gi,
    /src="([^"]+\.pdf[^"]*)"/gi,
    /href='([^']+\.pdf[^']*)'/gi,
    /"url"\s*:\s*"([^"]+\.pdf[^"]*)"/gi,
    /"downloadUrl"\s*:\s*"([^"]+)"/gi,
    /"factsheetUrl"\s*:\s*"([^"]+)"/gi,
    /"documentUrl"\s*:\s*"([^"]+)"/gi,
  ]
  const base = new URL(baseUrl)
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      try {
        const href = match[1]
        const absolute = href.startsWith("http")
          ? href
          : new URL(href, base).toString()
        if (!links.includes(absolute)) links.push(absolute)
      } catch {}
    }
  }
  return links
}
