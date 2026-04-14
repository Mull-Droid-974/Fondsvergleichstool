import { NextRequest, NextResponse } from "next/server"
import { scrapeFundinfo } from "@/lib/scraper/fundinfo"
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

  const result = await scrapeFundinfo(normalized)

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        isin: normalized,
        error: result.error,
      },
      { status: 200 } // 200 so client can show fallback UI
    )
  }

  return NextResponse.json({
    success: true,
    isin: normalized,
    pdfBase64: result.pdfBase64,
    sourceUrl: result.sourceUrl,
  })
}
