export interface Holding {
  name: string
  weight: number // in % (z.B. 5.2)
  isin?: string
  sector?: string
}

export interface SectorWeight {
  sector: string
  weight: number // in %
}

export interface RegionWeight {
  region: string
  weight: number // in %
}

export interface FundData {
  isin: string
  name: string
  provider: string
  currency: string
  inceptionDate?: string
  aum?: number // in Mrd. EUR/USD

  costs: {
    ter: number | null // Total Expense Ratio in %
    managementFee: number | null
    performanceFee: number | null
  }

  portfolio: {
    top10Holdings: Holding[]
    sectorWeights: SectorWeight[]
    regionWeights: RegionWeight[]
    activeShare?: number // in %
    numberOfPositions?: number
  }

  esg: {
    sfdrArticle: 6 | 8 | 9 | null
    approach?: string // "ESG Integration", "Best-in-Class", etc.
    exclusions?: string[] // ["Waffen", "Tabak", ...]
    sustainabilityScore?: number // 0-100
  }

  risk: {
    volatility?: number // annualisiert, in %
    maxDrawdown?: number // in %
    sharpeRatio?: number
    beta?: number
  }

  factsheetSource: "scraped" | "uploaded"
  extractionConfidence?: number // 0-1
}

export interface PunchyStatement {
  category: "cost" | "esg" | "risk" | "portfolio" | "general"
  statement: string // Die prägnante Aussage
  dataPoints: string[] // Stützende Fakten
  sentiment: "positive" | "neutral" | "negative" | "info"
  fundIsin?: string // Welcher Fonds betroffen (undefined = Vergleich gesamt)
}

export interface ComparisonResult {
  primaryFund: FundData
  peers: FundData[]
  statements: PunchyStatement[]
  generatedAt: string
}

export interface ScrapeResult {
  success: boolean
  isin: string
  pdfBase64?: string
  error?: string
}

export interface ExtractionRequest {
  isin: string
  pdfBase64?: string
  blobUrl?: string
}

export interface AnalysisRequest {
  primaryFund: FundData
  peers: FundData[]
}
