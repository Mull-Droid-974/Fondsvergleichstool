"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ComparisonResult } from "@/lib/types/fund"

interface ExportButtonProps {
  result: ComparisonResult
}

export function ExportButton({ result }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })

      if (!response.ok) {
        throw new Error("PDF-Export fehlgeschlagen")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Fondsvergleich_${result.primaryFund.isin}_${
        new Date().toISOString().split("T")[0]
      }.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      className="border-slate-300 hover:bg-slate-50"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isExporting ? "Wird exportiert..." : "PDF exportieren"}
    </Button>
  )
}
