"use client"

import { useCallback, useState } from "react"
import { Upload, FileText, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PdfUploadFallbackProps {
  isin: string
  errorMessage?: string
  onUpload: (isin: string, file: File) => void
  isUploading?: boolean
}

export function PdfUploadFallback({
  isin,
  errorMessage,
  onUpload,
  isUploading,
}: PdfUploadFallbackProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        return
      }
      setSelectedFile(file)
      onUpload(isin, file)
    },
    [isin, onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-800">
            Automatischer Download fehlgeschlagen
          </p>
          {errorMessage && (
            <p className="text-xs text-amber-700 mt-0.5">{errorMessage}</p>
          )}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-md p-4 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-slate-500 bg-slate-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
        onClick={() => document.getElementById(`upload-${isin}`)?.click()}
      >
        <input
          id={`upload-${isin}`}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-2 text-slate-700">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">{selectedFile.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-5 w-5 text-slate-400" />
            <p className="text-xs text-slate-600">
              Factsheet PDF hier ablegen oder{" "}
              <span className="text-slate-800 font-semibold">auswählen</span>
            </p>
            <p className="text-xs text-slate-400">ISIN: {isin}</p>
          </div>
        )}
      </div>

      {isUploading && (
        <p className="text-xs text-slate-500 text-center">
          Wird verarbeitet...
        </p>
      )}
    </div>
  )
}
