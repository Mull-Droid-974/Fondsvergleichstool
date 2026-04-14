import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const isin = formData.get("isin") as string | null

  if (!file || !isin) {
    return NextResponse.json(
      { error: "Datei und ISIN sind erforderlich" },
      { status: 400 }
    )
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Nur PDF-Dateien werden akzeptiert" },
      { status: 400 }
    )
  }

  if (file.size > 20 * 1024 * 1024) {
    // 20 MB limit
    return NextResponse.json(
      { error: "Datei zu groß (max. 20 MB)" },
      { status: 400 }
    )
  }

  try {
    const blob = await put(`factsheets/${isin}_${Date.now()}.pdf`, file, {
      access: "public",
      addRandomSuffix: false,
    })

    return NextResponse.json({
      success: true,
      isin,
      blobUrl: blob.url,
    })
  } catch (error) {
    // Fallback: return base64 if Vercel Blob not configured
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    return NextResponse.json({
      success: true,
      isin,
      pdfBase64: base64,
    })
  }
}
