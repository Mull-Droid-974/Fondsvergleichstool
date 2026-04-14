import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { FundData } from "@/lib/types/fund"

const client = new Anthropic()

// Accept any value from Claude: number, null, or undefined → normalize to number | null
const nullableNum = z
  .union([z.number(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "number" ? v : null))

// Accept string, null, or undefined → normalize to string | undefined
const optStr = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" && v !== "" ? v : undefined))

// Accept number, null, or undefined → normalize to number | undefined
const optNum = z
  .union([z.number(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "number" ? v : undefined))

const HoldingSchema = z.object({
  name: z.string(),
  weight: z.number(),
  isin: optStr,
  sector: optStr,
})

const FundDataSchema = z.object({
  isin: z.string(),
  name: z.string(),
  provider: z.string(),
  currency: z.string().default("EUR"),
  inceptionDate: optStr,
  aum: optNum,
  costs: z.object({
    ter: nullableNum,
    managementFee: nullableNum,
    performanceFee: nullableNum,
  }),
  portfolio: z.object({
    top10Holdings: z.array(HoldingSchema).default([]),
    sectorWeights: z
      .array(z.object({ sector: z.string(), weight: z.number() }))
      .default([]),
    regionWeights: z
      .array(z.object({ region: z.string(), weight: z.number() }))
      .default([]),
    activeShare: optNum,
    numberOfPositions: optNum,
  }),
  esg: z.object({
    sfdrArticle: z
      .union([z.literal(6), z.literal(8), z.literal(9), z.null(), z.undefined()])
      .transform((v) => (v === undefined ? null : v)),
    approach: optStr,
    exclusions: z
      .union([z.array(z.string()), z.null(), z.undefined()])
      .transform((v) => (Array.isArray(v) && v.length > 0 ? v : undefined)),
    sustainabilityScore: optNum,
  }),
  risk: z.object({
    volatility: optNum,
    maxDrawdown: optNum,
    sharpeRatio: optNum,
    beta: optNum,
  }),
  extractionConfidence: optNum,
})

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein präziser Finanz-Daten-Extraktor. Deine Aufgabe ist es, strukturierte Fondsdaten aus Factsheet-Texten zu extrahieren.

Gib die Daten als valides JSON zurück:

{
  "isin": "string",
  "name": "string - vollständiger Fondsname",
  "provider": "string - Asset Manager",
  "currency": "string - EUR/USD/CHF",
  "inceptionDate": "YYYY-MM-DD oder null",
  "aum": "Zahl in Milliarden oder null",
  "costs": {
    "ter": "Zahl in % (z.B. 0.75) oder null",
    "managementFee": "Zahl in % oder null",
    "performanceFee": "Zahl in % oder null"
  },
  "portfolio": {
    "top10Holdings": [{"name": "string", "weight": Zahl, "isin": "string oder null", "sector": "string oder null"}],
    "sectorWeights": [{"sector": "string", "weight": Zahl}],
    "regionWeights": [{"region": "string", "weight": Zahl}],
    "activeShare": "Zahl oder null",
    "numberOfPositions": "Zahl oder null"
  },
  "esg": {
    "sfdrArticle": 6, 8, 9, oder null,
    "approach": "string oder null",
    "exclusions": ["string"] oder null,
    "sustainabilityScore": "Zahl 0-100 oder null"
  },
  "risk": {
    "volatility": "Zahl in % oder null",
    "maxDrawdown": "Zahl in % oder null",
    "sharpeRatio": "Zahl oder null",
    "beta": "Zahl oder null"
  },
  "extractionConfidence": 0.0-1.0
}

Regeln:
- Prozentwerte als reine Zahl (0.75 nicht "0.75%")
- AuM in Milliarden
- Nicht gefundene Werte als null
- NUR JSON zurückgeben, keine Erklärungen`

export async function extractFundDataFromText(
  pdfText: string,
  isin: string
): Promise<FundData> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `ISIN: ${isin}\n\nFactsheet-Inhalt:\n${pdfText.slice(0, 50000)}`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Unerwartete Antwort vom AI-Extraktor")
  }

  const jsonMatch =
    content.text.match(/```json\n?([\s\S]+?)\n?```/) ||
    content.text.match(/\{[\s\S]+\}/)
  if (!jsonMatch) {
    throw new Error("Kein valides JSON in der AI-Antwort gefunden")
  }

  const rawJson = jsonMatch[1] ?? jsonMatch[0]
  const parsed = JSON.parse(rawJson)
  parsed.isin = isin

  const validated = FundDataSchema.parse(parsed)
  return { ...validated, factsheetSource: "scraped" } as FundData
}
