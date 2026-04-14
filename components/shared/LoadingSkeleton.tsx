"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, Loader2, AlertCircle, Upload } from "lucide-react"
import type { FundProcessingState, ProcessingStep } from "@/hooks/useFundComparison"
import { PdfUploadFallback } from "@/components/fund-input/PdfUploadFallback"

interface LoadingSkeletonProps {
  fundStates: FundProcessingState[]
  onUpload: (isin: string, file: File) => void
}

const STEP_LABELS: Record<ProcessingStep, string> = {
  idle: "Ausstehend",
  scraping: "Factsheet wird heruntergeladen...",
  extracting: "KI-Extraktion läuft...",
  analyzing: "Analyse wird durchgeführt...",
  done: "Abgeschlossen",
  error: "Fehler",
}

function StepIcon({ step }: { step: ProcessingStep }) {
  if (step === "done")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (step === "error")
    return <AlertCircle className="h-4 w-4 text-red-500" />
  if (step === "idle")
    return <Circle className="h-4 w-4 text-slate-300" />
  return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
}

export function LoadingSkeleton({ fundStates, onUpload }: LoadingSkeletonProps) {
  const doneCount = fundStates.filter((s) => s.step === "done").length
  const total = fundStates.length
  const progress = total > 0 ? (doneCount / total) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Fortschritt</span>
          <span className="tabular-nums font-medium">{doneCount}/{total} Fonds verarbeitet</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Per-fund status */}
      <div className="space-y-3">
        {fundStates.map((state, i) => (
          <div key={state.isin} className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <StepIcon step={state.step} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {state.isin}
                  </span>
                  {i === 0 && (
                    <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded-full">
                      Primär
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {STEP_LABELS[state.step]}
                </p>
              </div>
            </div>

            {/* Upload fallback */}
            {state.needsUpload && (
              <PdfUploadFallback
                isin={state.isin}
                errorMessage={state.error}
                onUpload={onUpload}
                isUploading={state.step === "extracting"}
              />
            )}
          </div>
        ))}
      </div>

      {/* Skeleton preview of results */}
      <div className="opacity-40 space-y-3 pointer-events-none">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}
