import { NextRequest, NextResponse } from "next/server"
import {
  extractTextFromPdfBase64,
  extractTextFromUrl,
} from "@/lib/extraction/pdf-text"
import { extractFundDataFromText } from "@/lib/extraction/ai-extractor"
import type { ExtractionRequest } from "@/lib/types/fund"

export async function POST(request: NextRequest) {
  // Guard: API key must be set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[extract] ANTHROPIC_API_KEY ist nicht gesetzt!")
    return NextResponse.json(
      { error: "Serverkonfigurationsfehler: ANTHROPIC_API_KEY fehlt. Bitte in den Vercel Environment Variables setzen." },
      { status: 500 }
    )
  }

  const body: ExtractionRequest = await request.json()
  const { isin, pdfBase64, blobUrl } = body

  if (!isin) {
    return NextResponse.json({ error: "ISIN fehlt" }, { status: 400 })
  }

  if (!pdfBase64 && !blobUrl) {
    return NextResponse.json(
      { error: "Entweder pdfBase64 oder blobUrl muss angegeben werden" },
      { status: 400 }
    )
  }

  try {
    // Extract raw text from PDF
    const pdfText = pdfBase64
      ? await extractTextFromPdfBase64(pdfBase64)
      : await extractTextFromUrl(blobUrl!)

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json(
        { error: "PDF enthält zu wenig lesbaren Text (möglicherweise gescannt)" },
        { status: 422 }
      )
    }

    // Extract structured data via AI
    const fundData = await extractFundDataFromText(pdfText, isin)
    if (blobUrl) {
      fundData.factsheetSource = "uploaded"
    }

    return NextResponse.json({ success: true, fundData })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler"
    console.error(`[extract] Fehler bei ISIN ${isin}:`, error)
    return NextResponse.json(
      { error: `Extraktion fehlgeschlagen: ${message}` },
      { status: 500 }
    )
  }
}
