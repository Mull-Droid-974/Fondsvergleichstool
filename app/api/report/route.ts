import { NextRequest, NextResponse } from "next/server"
import React from "react"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { ComparisonResult } from "@/lib/types/fund"

export async function POST(request: NextRequest) {
  const result: ComparisonResult = await request.json()

  if (!result.primaryFund || !result.peers) {
    return NextResponse.json(
      { error: "Ungültige Vergleichsdaten" },
      { status: 400 }
    )
  }

  try {
    const { renderToBuffer } = await import("@react-pdf/renderer")
    const { FundReportDocument } = await import("@/lib/pdf-report/FundReportTemplate")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(FundReportDocument, { result }) as any
    const buffer: Buffer = await renderToBuffer(element)

    const filename = `Fondsvergleich_${result.primaryFund.isin}_${
      new Date().toISOString().split("T")[0]
    }.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler"
    console.error("[report] PDF-Generierung fehlgeschlagen:", error)
    return NextResponse.json(
      { error: `PDF-Generierung fehlgeschlagen: ${message}` },
      { status: 500 }
    )
  }
}
