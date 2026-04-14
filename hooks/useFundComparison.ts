"use client"

import { useState, useCallback } from "react"
import type { FundData, ComparisonResult, PunchyStatement } from "@/lib/types/fund"

export type ProcessingStep =
  | "idle"
  | "scraping"
  | "extracting"
  | "analyzing"
  | "done"
  | "error"

export interface FundProcessingState {
  isin: string
  step: ProcessingStep
  error?: string
  fundData?: FundData
  needsUpload?: boolean
}

interface UseFundComparisonReturn {
  isProcessing: boolean
  fundStates: FundProcessingState[]
  result: ComparisonResult | null
  error: string | null
  startComparison: (primaryIsin: string, peerIsins: string[]) => Promise<void>
  uploadFallback: (isin: string, file: File) => Promise<void>
  reset: () => void
}

async function scrapeAndExtract(
  isin: string
): Promise<{ fundData?: FundData; needsUpload?: boolean; error?: string }> {
  // Step 1: Try scraping
  const scrapeRes = await fetch(`/api/scrape?isin=${encodeURIComponent(isin)}`)
  const scrapeData = await scrapeRes.json()

  if (!scrapeData.success) {
    // Scraping failed – signal that manual upload is needed
    return { needsUpload: true, error: scrapeData.error }
  }

  // Step 2: Extract data from scraped PDF
  const extractRes = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      isin,
      pdfBase64: scrapeData.pdfBase64,
    }),
  })
  const extractData = await extractRes.json()

  if (!extractData.success) {
    return { needsUpload: true, error: extractData.error }
  }

  return { fundData: extractData.fundData }
}

export function useFundComparison(): UseFundComparisonReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [fundStates, setFundStates] = useState<FundProcessingState[]>([])
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateFundState = useCallback(
    (isin: string, update: Partial<FundProcessingState>) => {
      setFundStates((prev) =>
        prev.map((s) => (s.isin === isin ? { ...s, ...update } : s))
      )
    },
    []
  )

  const startComparison = useCallback(
    async (primaryIsin: string, peerIsins: string[]) => {
      const allIsins = [primaryIsin, ...peerIsins]
      setIsProcessing(true)
      setError(null)
      setResult(null)
      setFundStates(
        allIsins.map((isin) => ({ isin, step: "scraping" as ProcessingStep }))
      )

      // Process all ISINs in parallel
      const results = await Promise.all(
        allIsins.map(async (isin) => {
          updateFundState(isin, { step: "scraping" })
          const res = await scrapeAndExtract(isin)

          if (res.needsUpload) {
            updateFundState(isin, {
              step: "idle",
              needsUpload: true,
              error: res.error,
            })
            return { isin, fundData: undefined, needsUpload: true }
          }

          if (res.fundData) {
            updateFundState(isin, { step: "done", fundData: res.fundData })
          } else {
            updateFundState(isin, { step: "error", error: res.error })
          }

          return { isin, fundData: res.fundData }
        })
      )

      const extractedFunds = results
        .filter((r) => r.fundData)
        .map((r) => r.fundData!)

      const hasPendingUploads = results.some((r) => r.needsUpload)

      if (!hasPendingUploads && extractedFunds.length >= 1) {
        await runAnalysis(primaryIsin, extractedFunds)
      }

      setIsProcessing(hasPendingUploads || extractedFunds.length < 1)
    },
    [updateFundState]
  )

  const runAnalysis = async (primaryIsin: string, funds: FundData[]) => {
    const primaryFund = funds.find((f) => f.isin === primaryIsin) ?? funds[0]
    const peers = funds.filter((f) => f.isin !== primaryFund.isin)

    if (peers.length === 0) {
      setError("Mindestens ein Peer-Fonds mit erfolgreich extrahierten Daten wird benötigt.")
      setIsProcessing(false)
      return
    }

    try {
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryFund, peers }),
      })
      const analyzeData = await analyzeRes.json()

      if (!analyzeData.success) {
        setError(analyzeData.error)
      } else {
        setResult({
          primaryFund,
          peers,
          statements: analyzeData.statements as PunchyStatement[],
          generatedAt: new Date().toISOString(),
        })
      }
    } catch (err) {
      setError("Analyse fehlgeschlagen: " + String(err))
    }
    setIsProcessing(false)
  }

  const uploadFallback = useCallback(
    async (isin: string, file: File) => {
      updateFundState(isin, { step: "extracting", needsUpload: false })

      const formData = new FormData()
      formData.append("file", file)
      formData.append("isin", isin)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.success) {
        updateFundState(isin, { step: "error", error: uploadData.error })
        return
      }

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isin,
          pdfBase64: uploadData.pdfBase64,
          blobUrl: uploadData.blobUrl,
        }),
      })
      const extractData = await extractRes.json()

      if (!extractData.success) {
        updateFundState(isin, { step: "error", error: extractData.error })
        return
      }

      const updatedFundData: FundData = {
        ...extractData.fundData,
        factsheetSource: "uploaded",
      }
      updateFundState(isin, { step: "done", fundData: updatedFundData })

      // Check if all funds are now extracted
      setFundStates((prev) => {
        const updated = prev.map((s) =>
          s.isin === isin ? { ...s, step: "done" as ProcessingStep, fundData: updatedFundData } : s
        )
        const allDone = updated.every(
          (s) => s.step === "done" && s.fundData
        )
        if (allDone) {
          const allFunds = updated.map((s) => s.fundData!)
          const primaryIsin = updated[0].isin
          runAnalysis(primaryIsin, allFunds)
        }
        return updated
      })
    },
    [updateFundState]
  )

  const reset = useCallback(() => {
    setIsProcessing(false)
    setFundStates([])
    setResult(null)
    setError(null)
  }, [])

  return {
    isProcessing,
    fundStates,
    result,
    error,
    startComparison,
    uploadFallback,
    reset,
  }
}
