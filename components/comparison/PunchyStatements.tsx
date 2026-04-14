"use client"

import { TrendingDown, TrendingUp, Leaf, PieChart, Info, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { PunchyStatement } from "@/lib/types/fund"
import { cn } from "@/lib/utils"

interface PunchyStatementsProps {
  statements: PunchyStatement[]
}

const CATEGORY_CONFIG = {
  cost: {
    label: "Kosten",
    icon: TrendingDown,
    color: "bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  esg: {
    label: "ESG",
    icon: Leaf,
    color: "bg-emerald-50 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  risk: {
    label: "Risiko",
    icon: AlertCircle,
    color: "bg-orange-50 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  portfolio: {
    label: "Portfolio",
    icon: PieChart,
    color: "bg-purple-50 border-purple-200",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  general: {
    label: "Allgemein",
    icon: Info,
    color: "bg-slate-50 border-slate-200",
    badgeClass: "bg-slate-100 text-slate-700",
  },
}

const SENTIMENT_ICON = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Info,
  info: Info,
}

const SENTIMENT_COLOR = {
  positive: "text-emerald-600",
  negative: "text-red-500",
  neutral: "text-slate-500",
  info: "text-slate-500",
}

export function PunchyStatements({ statements }: PunchyStatementsProps) {
  const categories = ["cost", "esg", "risk", "portfolio", "general"] as const
  const grouped = categories.reduce(
    (acc, cat) => {
      acc[cat] = statements.filter((s) => s.category === cat)
      return acc
    },
    {} as Record<string, PunchyStatement[]>
  )

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catStatements = grouped[cat]
        if (!catStatements || catStatements.length === 0) return null

        const config = CATEGORY_CONFIG[cat]
        const Icon = config.icon

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-700">{config.label}</h4>
              <span className="text-xs text-slate-400">({catStatements.length})</span>
            </div>
            <div className="space-y-2">
              {catStatements.map((stmt, i) => {
                const SentimentIcon = SENTIMENT_ICON[stmt.sentiment]
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-4 space-y-2",
                      config.color
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <SentimentIcon
                        className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          SENTIMENT_COLOR[stmt.sentiment]
                        )}
                      />
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {stmt.statement}
                      </p>
                    </div>
                    {stmt.dataPoints.length > 0 && (
                      <div className="ml-6 flex flex-wrap gap-1.5">
                        {stmt.dataPoints.map((dp, j) => (
                          <span
                            key={j}
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                              config.badgeClass
                            )}
                          >
                            {dp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
