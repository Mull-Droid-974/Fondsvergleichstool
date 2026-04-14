import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { FundData } from "@/lib/types/fund"

const client = new Anthropic()

const HoldingSchema = z.object({
  name: z.string(),
  weight: z.number(),
  isin: z.string().optional(),
  sector: z.string().optional(),
})

// nullish() accepts both null and undefined — handles Claude returning null for missing fields
const opt = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((v) => v ?? undefined)

const FundDataSchema = z.object({
  isin: z.string(),
  name: z.string(),
  provider: z.string(),
  currency: z.string().default("EUR"),
  inceptionDate: opt(z.string()),
  aum: opt(z.number()),
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
    activeShare: opt(z.number()),
    numberOfPositions: opt(z.number()),
  }),
  esg: z.object({
    sfdrArticle: z.union([z.literal(6), z.literal(8), z.literal(9)]).nullable(),
    approach: opt(z.string()),
    exclusions: z.array(z.string()).nullish().transform((v) => v ?? undefined),
    sustainabilityScore: opt(z.number()),
  }),
  risk: z.object({
    volatility: opt(z.number()),
    maxDrawdown: opt(z.number()),
    sharpeRatio: opt(z.number()),
    beta: opt(z.number()),
  }),
  extractionConfidence: opt(z.number().min(0).max(1)),
})

const EXTRACTION_SYSTEM_PROMPT = `Du bist ein präziser Finanz-Daten-Extraktor. Deine Aufgabe ist es, strukturierte Fondsdaten aus Factsheet-Texten zu extrahieren.

Extrahiere exakt die folgenden Felder und gib sie als valides JSON zurück:

{
  "isin": "string - ISIN-Nummer",
  "name": "string - Vollständiger Fondsname",
  "provider": "string - Fondsanbieter/Asset Manager",
  "currency": "string - Hauptwährung (EUR/USD/CHF)",
  "inceptionDate": "string optional - Auflagedatum im ISO-Format YYYY-MM-DD",
  "aum": "number optional - Assets under Management in Milliarden der Hauptwährung",
  "costs": {
    "ter": "number|null - Total Expense Ratio in Prozent (z.B. 0.75 für 0.75%)",
    "managementFee": "number|null - Management Fee in Prozent",
    "performanceFee": "number|null - Performance Fee in Prozent, null wenn keine"
  },
  "portfolio": {
    "top10Holdings": [{"name": "string", "weight": "number in %", "isin": "string optional", "sector": "string optional"}],
    "sectorWeights": [{"sector": "string", "weight": "number in %"}],
    "regionWeights": [{"region": "string", "weight": "number in %"}],
    "activeShare": "number optional - Active Share in %",
    "numberOfPositions": "number optional - Anzahl Positionen"
  },
  "esg": {
    "sfdrArticle": 6|8|9|null - SFDR-Klassifizierung,
    "approach": "string optional - ESG-Ansatz",
    "exclusions": ["string"] optional - Liste der Ausschlüsse,
    "sustainabilityScore": "number optional - 0-100"
  },
  "risk": {
    "volatility": "number optional - Annualisierte Volatilität in %",
    "maxDrawdown": "number optional - Maximaler Drawdown in % (negativer Wert)",
    "sharpeRatio": "number optional",
    "beta": "number optional"
  },
  "extractionConfidence": "number - 0.0-1.0, wie sicher du dir bei der Extraktion bist"
}

Wichtig:
- Alle Prozentzahlen als reine Zahl (z.B. 0.75 nicht "0.75%")
- AuM immer in Milliarden (z.B. 2.3 für 2.3 Mrd.)
- Fehlende Werte als null, nicht als 0 oder leerer String
- ISIN wird als Parameter übergeben, verwende diese wenn nicht im Dokument gefunden
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

  // Ensure ISIN is set correctly
  parsed.isin = isin
  parsed.factsheetSource = "scraped"

  const validated = FundDataSchema.parse(parsed)
  return { ...validated, factsheetSource: "scraped" } as FundData
}
