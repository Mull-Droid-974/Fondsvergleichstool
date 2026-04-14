"use client"

import { useState } from "react"
import { Plus, Trash2, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateIsin, normalizeIsin } from "@/lib/utils/validators"

interface IsinFormProps {
  onSubmit: (primaryIsin: string, peerIsins: string[]) => void
  isLoading?: boolean
}

export function IsinForm({ onSubmit, isLoading }: IsinFormProps) {
  const [primaryIsin, setPrimaryIsin] = useState("")
  const [peerIsins, setPeerIsins] = useState<string[]>([""])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateAll(): boolean {
    const newErrors: Record<string, string> = {}
    const primary = normalizeIsin(primaryIsin)

    if (!primary) {
      newErrors["primary"] = "ISIN ist erforderlich"
    } else if (!validateIsin(primary)) {
      newErrors["primary"] = "Ungültige ISIN (falsches Format oder Prüfziffer)"
    }

    peerIsins.forEach((isin, i) => {
      if (!isin.trim()) return
      const normalized = normalizeIsin(isin)
      if (!validateIsin(normalized)) {
        newErrors[`peer_${i}`] = "Ungültige ISIN"
      }
      if (normalized === normalizeIsin(primaryIsin)) {
        newErrors[`peer_${i}`] = "Peer darf nicht identisch zum Primär-Fonds sein"
      }
    })

    const validPeers = peerIsins.filter((i) => i.trim())
    if (validPeers.length === 0) {
      newErrors["peers"] = "Mindestens ein Peer-Fonds erforderlich"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAll()) return

    const validPeers = peerIsins
      .filter((i) => i.trim())
      .map(normalizeIsin)
      .filter(validateIsin)

    onSubmit(normalizeIsin(primaryIsin), validPeers)
  }

  function addPeer() {
    if (peerIsins.length < 5) {
      setPeerIsins([...peerIsins, ""])
    }
  }

  function removePeer(index: number) {
    setPeerIsins(peerIsins.filter((_, i) => i !== index))
  }

  function updatePeer(index: number, value: string) {
    const updated = [...peerIsins]
    updated[index] = value.toUpperCase()
    setPeerIsins(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Primary Fund */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="primary-isin" className="text-sm font-semibold text-slate-700">
            Primär-Fonds
          </Label>
          <Badge variant="default" className="bg-slate-800 text-xs">
            Ihr Fonds
          </Badge>
        </div>
        <div className="relative">
          <Input
            id="primary-isin"
            value={primaryIsin}
            onChange={(e) => setPrimaryIsin(e.target.value.toUpperCase())}
            placeholder="z.B. CH0012221716"
            className={`font-mono text-sm h-11 tracking-wider ${
              errors["primary"] ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
            maxLength={12}
            disabled={isLoading}
          />
          {primaryIsin && validateIsin(normalizeIsin(primaryIsin)) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </div>
        {errors["primary"] && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors["primary"]}
          </p>
        )}
      </div>

      {/* Peer Funds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-700">
            Peer-Fonds{" "}
            <span className="font-normal text-slate-500">
              ({peerIsins.filter((i) => i.trim()).length}/{peerIsins.length} eingetragen)
            </span>
          </Label>
          {peerIsins.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPeer}
              disabled={isLoading}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Peer hinzufügen
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {peerIsins.map((isin, index) => (
            <div key={index} className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Input
                  value={isin}
                  onChange={(e) => updatePeer(index, e.target.value)}
                  placeholder={`Peer ${index + 1} ISIN`}
                  className={`font-mono text-sm h-10 tracking-wider ${
                    errors[`peer_${index}`]
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                  maxLength={12}
                  disabled={isLoading}
                />
                {isin && validateIsin(normalizeIsin(isin)) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>
              {peerIsins.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePeer(index)}
                  disabled={isLoading}
                  className="h-10 w-10 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {peerIsins.map(
            (_, i) =>
              errors[`peer_${i}`] && (
                <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Peer {i + 1}: {errors[`peer_${i}`]}
                </p>
              )
          )}
        </div>

        {errors["peers"] && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{errors["peers"]}</AlertDescription>
          </Alert>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-semibold"
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        {isLoading ? "Analyse läuft..." : "Fonds vergleichen"}
      </Button>
    </form>
  )
}
