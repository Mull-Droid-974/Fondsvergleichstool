import { NextRequest, NextResponse } from "next/server"
import { generatePunchyStatements } from "@/lib/analysis/statement-generator"
import type { AnalysisRequest } from "@/lib/types/fund"

export async function POST(request: NextRequest) {
  const body: AnalysisRequest = await request.json()
  const { primaryFund, peers } = body

  if (!primaryFund || !peers) {
    return NextResponse.json(
      { error: "primaryFund und peers sind erforderlich" },
      { status: 400 }
    )
  }

  try {
    const statements = await generatePunchyStatements(primaryFund, peers)
    return NextResponse.json({ success: true, statements })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler"
    console.error("[analyze] Fehler:", error)
    return NextResponse.json(
      { error: `Analyse fehlgeschlagen: ${message}` },
      { status: 500 }
    )
  }
}
