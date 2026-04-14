import { NextRequest, NextResponse } from "next/server"
import { scrapeFactsheet } from "@/lib/scraper"
import { normalizeIsin, validateIsin } from "@/lib/utils/validators"

export async function GET(request: NextRequest) {
  const isin = request.nextUrl.searchParams.get("isin")

  if (!isin) {
    return NextResponse.json({ error: "ISIN-Parameter fehlt" }, { status: 400 })
  }

  const normalized = normalizeIsin(isin)
  if (!validateIsin(normalized)) {
    return NextResponse.json(
      { error: `Ungültige ISIN: ${normalized}` },
      { status: 400 }
    )
  }

  const result = await scrapeFactsheet(normalized)

  return NextResponse.json({
    success: result.success,
    isin: normalized,
    pdfBase64: result.pdfBase64,
    source: result.source,
    error: result.error,
  })
}

// Increase timeout for scraping (Vercel Pro: 60s, Hobby: 10s default)
export const maxDuration = 60
