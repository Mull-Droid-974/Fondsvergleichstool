"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, Suspense } from "react"
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ComparisonTable } from "@/components/comparison/ComparisonTable"
import { CostBarChart } from "@/components/comparison/CostBarChart"
import { EsgRadarChart } from "@/components/comparison/EsgRadarChart"
import { PunchyStatements } from "@/components/comparison/PunchyStatements"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { ExportButton } from "@/components/shared/ExportButton"
import { useFundComparison } from "@/hooks/useFundComparison"
import { formatDate } from "@/lib/utils/formatters"

function CompareContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const {
    isProcessing,
    fundStates,
    result,
    error,
    startComparison,
    uploadFallback,
    reset,
  } = useFundComparison()

  useEffect(() => {
    const primary = searchParams.get("primary")
    const peers = searchParams.getAll("peer")
    if (primary && peers.length > 0) {
      startComparison(primary, peers)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleReset() {
    reset()
    router.push("/")
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Neue Analyse
        </Button>
        {result && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              Generiert: {formatDate(result.generatedAt)}
            </p>
            <ExportButton result={result} />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isProcessing && !result && (
        <LoadingSkeleton fundStates={fundStates} onUpload={uploadFallback} />
      )}

      {/* Pending uploads for some funds while others succeeded */}
      {!isProcessing && fundStates.some((s) => s.needsUpload) && (
        <LoadingSkeleton fundStates={fundStates} onUpload={uploadFallback} />
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {result.primaryFund.name}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Verglichen mit {result.peers.length} Peer
              {result.peers.length !== 1 ? "s" : ""}:{" "}
              {result.peers.map((p) => p.name).join(", ")}
            </p>
          </div>

          {/* Punchy Statements */}
          <Card className="border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-800">
                Key Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PunchyStatements statements={result.statements} />
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Kostenvergleich (TER)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CostBarChart
                  primaryFund={result.primaryFund}
                  peers={result.peers}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  ESG & Risikoprofil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EsgRadarChart
                  primaryFund={result.primaryFund}
                  peers={result.peers}
                />
              </CardContent>
            </Card>
          </div>

          {/* Detailed comparison table */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Detaillierter Kennzahlenvergleich
            </h2>
            <ComparisonTable
              primaryFund={result.primaryFund}
              peers={result.peers}
            />
          </div>

          {/* Top Holdings */}
          {result.primaryFund.portfolio.top10Holdings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Top-10 Holdings — Primärfonds
              </h2>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Gewichtung
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.primaryFund.portfolio.top10Holdings.map((h, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="px-4 py-2 text-slate-400 tabular-nums font-mono text-xs">
                          {(i + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="px-4 py-2 text-slate-800 font-medium">
                          {h.name}
                          {h.sector && (
                            <span className="ml-2 text-xs text-slate-400">
                              {h.sector}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-mono text-slate-700">
                          {h.weight.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Wird geladen...</div>}>
      <CompareContent />
    </Suspense>
  )
}
