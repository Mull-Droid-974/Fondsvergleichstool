import Anthropic from "@anthropic-ai/sdk"
import type { FundData, PunchyStatement } from "@/lib/types/fund"

const client = new Anthropic()

/**
 * Pre-computes statistical comparisons before sending to Claude.
 * This makes the AI prompt smaller and more factual.
 */
function preComputeComparisons(
  primary: FundData,
  peers: FundData[]
): Record<string, string> {
  const allFunds = [primary, ...peers]
  const facts: Record<string, string> = {}

  // Cost analysis
  const tersWithValues = allFunds.filter((f) => f.costs.ter !== null)
  if (tersWithValues.length > 1) {
    const sorted = [...tersWithValues].sort(
      (a, b) => (a.costs.ter ?? 99) - (b.costs.ter ?? 99)
    )
    const cheapest = sorted[0]
    const mostExpensive = sorted[sorted.length - 1]
    const avgTer =
      tersWithValues.reduce((s, f) => s + (f.costs.ter ?? 0), 0) /
      tersWithValues.length

    facts["ter_cheapest"] = `${cheapest.name} (${cheapest.costs.ter?.toFixed(2)}%)`
    facts["ter_most_expensive"] = `${mostExpensive.name} (${mostExpensive.costs.ter?.toFixed(2)}%)`
    facts["ter_average"] = `${avgTer.toFixed(2)}%`
    facts["primary_ter_vs_avg"] = primary.costs.ter !== null
      ? `${((primary.costs.ter ?? 0) - avgTer).toFixed(2)}%`
      : "k.A."
  }

  // ESG analysis
  const esgArticles = allFunds.map((f) => ({
    name: f.name,
    article: f.esg.sfdrArticle,
  }))
  const art9Funds = esgArticles.filter((f) => f.article === 9)
  const art8Funds = esgArticles.filter((f) => f.article === 8)
  facts["art9_funds"] = art9Funds.map((f) => f.name).join(", ") || "Keiner"
  facts["art8_funds"] = art8Funds.map((f) => f.name).join(", ") || "Keiner"
  facts["primary_sfdr"] = `Artikel ${primary.esg.sfdrArticle ?? "k.A."}`

  // Risk analysis
  const volFunds = allFunds.filter((f) => f.risk.volatility !== undefined)
  if (volFunds.length > 1) {
    const lowestVol = [...volFunds].sort(
      (a, b) => (a.risk.volatility ?? 99) - (b.risk.volatility ?? 99)
    )[0]
    facts["lowest_volatility"] =
      `${lowestVol.name} (${lowestVol.risk.volatility?.toFixed(1)}%)`
  }

  // AuM
  const aumFunds = allFunds.filter((f) => f.aum !== undefined)
  if (aumFunds.length > 0) {
    const largest = [...aumFunds].sort(
      (a, b) => (b.aum ?? 0) - (a.aum ?? 0)
    )[0]
    facts["largest_aum"] = `${largest.name} (${largest.aum?.toFixed(1)} Mrd.)`
  }

  return facts
}

const ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Asset-Manager-Analyst, der prägnante Verkaufsargumente für Fonds-Präsentationen erstellt.

Erstelle 5-8 "Punchy Statements" auf Deutsch, die die wichtigsten Unterschiede zwischen dem Primärfonds und den Peer-Fonds hervorheben.
Fokussiere auf: Kostenvorteile, ESG-Stärken, Risikoprofil, Portfoliostruktur.

Antworte NUR mit einem JSON-Array ohne weitere Erklärungen:
[
  {
    "category": "cost|esg|risk|portfolio|general",
    "statement": "Prägnante Aussage max. 120 Zeichen",
    "dataPoints": ["Fakt 1", "Fakt 2"],
    "sentiment": "positive|neutral|negative|info",
    "fundIsin": "ISIN des betroffenen Fonds oder null für Vergleich"
  }
]

Regeln:
- Statements müssen faktisch korrekt und belegbar sein
- Verwende konkrete Zahlen aus den Daten
- Positive Sentiments für Stärken des Primärfonds, negative für Schwächen
- Maximal 2 negative Statements
- Sprache: professionelles Deutsch, keine Übertreibungen`

export async function generatePunchyStatements(
  primaryFund: FundData,
  peers: FundData[]
): Promise<PunchyStatement[]> {
  const facts = preComputeComparisons(primaryFund, peers)

  const fundsSummary = [primaryFund, ...peers]
    .map(
      (f) =>
        `[${f.isin}] ${f.name} (${f.provider}):
  - TER: ${f.costs.ter ?? "k.A."}% | Mgmt-Fee: ${f.costs.managementFee ?? "k.A."}%
  - SFDR: Art. ${f.esg.sfdrArticle ?? "k.A."} | Ansatz: ${f.esg.approach ?? "k.A."}
  - Ausschlüsse: ${f.esg.exclusions?.join(", ") ?? "k.A."}
  - Volatilität: ${f.risk.volatility?.toFixed(1) ?? "k.A."}% | Max. Drawdown: ${f.risk.maxDrawdown?.toFixed(1) ?? "k.A."}%
  - AuM: ${f.aum?.toFixed(1) ?? "k.A."} Mrd.
  - Positionen: ${f.portfolio.numberOfPositions ?? "k.A."} | Active Share: ${f.portfolio.activeShare?.toFixed(1) ?? "k.A."}%
  - Top Holdings: ${f.portfolio.top10Holdings.slice(0, 3).map((h) => `${h.name} ${h.weight?.toFixed(1)}%`).join(", ")}`
    )
    .join("\n\n")

  const factsStr = Object.entries(facts)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `PRIMÄRFONDS: ${primaryFund.isin} - ${primaryFund.name}

FONDSDATEN:
${fundsSummary}

VORBERECHNETE FAKTEN:
${factsStr}`,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Unerwartete Antwort vom AI-Analyseservice")
  }

  const jsonMatch =
    content.text.match(/```json\n?([\s\S]+?)\n?```/) ||
    content.text.match(/\[[\s\S]+\]/)
  if (!jsonMatch) {
    throw new Error("Kein valides JSON in der AI-Analyse-Antwort")
  }

  const rawJson = jsonMatch[1] ?? jsonMatch[0]
  const statements: PunchyStatement[] = JSON.parse(rawJson)

  return statements.map((s) => ({
    ...s,
    fundIsin: s.fundIsin || undefined,
  }))
}
