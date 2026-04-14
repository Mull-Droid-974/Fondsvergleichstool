import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { FundData } from "@/lib/types/fund"

const client = new Anthropic()

/**
 * Recursively replaces all null values with undefined.
 * This is needed because Claude returns null for missing optional fields,
 * but Zod .optional() only accepts undefined (not null).
 */
function stripNulls(value: unknown): unknown {
  if (value === null) return undefined
  if (Array.isArray(value)) return value.map(stripNulls)
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        stripNulls(v),
      ])
    )
  }
  return value
}

const HoldingSchema = z.object({
  name: z.string(),
  weight: z.number(),
  isin: z.string().optional(),
  sector: z.string().optional(),
})

const FundDataSchema = z.object({
  isin: z.string(),
  name: z.string(),
  provider: z.string(),
  currency: z.string().default("EUR"),
  inceptionDate: z.string().optional(),
  aum: z.number().optional(),
  costs: z.object({
    ter: z.number().nullable(),
    managementFee: z.number().nullable(),
    performanceFee: z.number().nullable(),
  }),
  portfolio: z.object({
    top10Holdings: z.array(HoldingSchema),
    sectorWeights: z.array(
      z.object({ sector: z.string(), weight: z.number() })
    ),
    regionWeights: z.array(
      z.object({ region: z.string(), weight: z.number() })
    ),
    activeShare: z.number().optional(),
    numberOfPositions: z.number().optional(),
  }),
  esg: z.object({
    sfdrArticle: z.union([z.literal(6), z.literal(8), z.literal(9)]).nullable(),
    approach: z.string().optional(),
    exclusions: z.array(z.string()).optional(),
    sustainabilityScore: z.number().optional(),
  }),
  risk: z.object({
    volatility: z.number().optional(),
    maxDrawdown: z.number().optional(),
    sharpeRatio: z.number().optional(),
    beta: z.number().optional(),
  }),
  extractionConfidence: z.number().min(0).max(1).optional(),
})

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein präziser Finanz-Daten-Extraktor. Deine Aufgabe ist es, strukturierte Fondsdaten aus Factsheet-Texten zu extrahieren.

Extrahiere exakt die folgenden Felder und gib sie als valides JSON zurück:

{
  "isin": "string - ISIN-Nummer",
  "name": "string - Vollständiger Fondsname",
  "provider": "string - Fondsanbieter/Asset Manager",
  "currency": "string - Hauptwährung (EUR/USD/CHF)",
  "inceptionDate": "string optional - Auflagedatum im ISO-Format YYYY-MM-DD, weglassen wenn unbekannt",
  "aum": "number optional - Assets under Management in Milliarden, weglassen wenn unbekannt",
  "costs": {
    "ter": "number|null - Total Expense Ratio in Prozent (z.B. 0.75 für 0.75%)",
    "managementFee": "number|null - Management Fee in Prozent",
    "performanceFee": "number|null - Performance Fee in Prozent, null wenn keine"
  },
  "portfolio": {
    "top10Holdings": [{"name": "string", "weight": number, "isin": "string oder weglassen", "sector": "string oder weglassen"}],
    "sectorWeights": [{"sector": "string", "weight": number}],
    "regionWeights": [{"region": "string", "weight": number}],
    "activeShare": "number optional - weglassen wenn unbekannt",
    "numberOfPositions": "number optional - weglassen wenn unbekannt"
  },
  "esg": {
    "sfdrArticle": 6|8|9|null,
    "approach": "string optional - weglassen wenn unbekannt",
    "exclusions": ["string array optional - weglassen wenn keine"],
    "sustainabilityScore": "number optional - weglassen wenn unbekannt"
  },
  "risk": {
    "volatility": "number optional - weglassen wenn unbekannt",
    "maxDrawdown": "number optional - weglassen wenn unbekannt",
    "sharpeRatio": "number optional - weglassen wenn unbekannt",
    "beta": "number optional - weglassen wenn unbekannt"
  },
  "extractionConfidence": 0.0-1.0
}

Wichtig:
- Alle Prozentzahlen als reine Zahl (z.B. 0.75 nicht "0.75%")
- AuM immer in Milliarden (z.B. 2.3 für 2.3 Mrd.)
- Fehlende optionale Felder WEGLASSEN (nicht null, nicht 0)
- Nur costs.ter/managementFee/performanceFee dürfen null sein
- Gib NUR valides JSON zurück, keine Erklärungen`

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

  // Extract JSON from response (may have markdown code blocks)
  const jsonMatch =
    content.text.match(/```json\n?([\s\S]+?)\n?```/) ||
    content.text.match(/\{[\s\S]+\}/)
  if (!jsonMatch) {
    throw new Error("Kein valides JSON in der AI-Antwort gefunden")
  }

  const rawJson = jsonMatch[1] ?? jsonMatch[0]
  const parsed = JSON.parse(rawJson)

  // Set ISIN and strip all nulls before Zod validation
  parsed.isin = isin
  const cleaned = stripNulls(parsed)

  const validated = FundDataSchema.parse(cleaned)
  return { ...validated, factsheetSource: "scraped" } as FundData
}
