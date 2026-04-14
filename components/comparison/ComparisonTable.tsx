"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { FundData } from "@/lib/types/fund"
import {
  formatPercent,
  formatAum,
  formatDate,
  formatSfdrArticle,
} from "@/lib/utils/formatters"
import { cn } from "@/lib/utils"

interface ComparisonTableProps {
  primaryFund: FundData
  peers: FundData[]
}

interface RowDef {
  label: string
  getValue: (f: FundData) => string | React.ReactNode
  highlight?: (f: FundData, all: FundData[]) => "low" | "high" | null
}

function getSfdrBadgeColor(article: 6 | 8 | 9 | null) {
  if (article === 9) return "bg-emerald-100 text-emerald-800 border-emerald-200"
  if (article === 8) return "bg-lime-100 text-lime-800 border-lime-200"
  return "bg-slate-100 text-slate-600 border-slate-200"
}

export function ComparisonTable({ primaryFund, peers }: ComparisonTableProps) {
  const allFunds = [primaryFund, ...peers]

  const rows: RowDef[] = [
    {
      label: "Fondsname",
      getValue: (f) => (
        <span className="font-medium text-slate-900">{f.name}</span>
      ),
    },
    {
      label: "Anbieter",
      getValue: (f) => f.provider || "—",
    },
    {
      label: "Währung",
      getValue: (f) => f.currency || "—",
    },
    {
      label: "Auflagedatum",
      getValue: (f) => formatDate(f.inceptionDate),
    },
    {
      label: "AuM",
      getValue: (f) => formatAum(f.aum, f.currency),
    },
    {
      label: "TER",
      getValue: (f) =>
        f.costs.ter !== null ? (
          <span className="tabular-nums">{formatPercent(f.costs.ter)}</span>
        ) : "—",
      highlight: (f, all) => {
        const ters = all.map((x) => x.costs.ter).filter((t) => t !== null) as number[]
        if (ters.length < 2 || f.costs.ter === null) return null
        if (f.costs.ter === Math.min(...ters)) return "low"
        if (f.costs.ter === Math.max(...ters)) return "high"
        return null
      },
    },
    {
      label: "Management Fee",
      getValue: (f) =>
        f.costs.managementFee !== null
          ? <span className="tabular-nums">{formatPercent(f.costs.managementFee)}</span>
          : "—",
    },
    {
      label: "Performance Fee",
      getValue: (f) =>
        f.costs.performanceFee !== null
          ? <span className="tabular-nums">{formatPercent(f.costs.performanceFee)}</span>
          : "Keine",
    },
    {
      label: "SFDR-Klassifizierung",
      getValue: (f) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            getSfdrBadgeColor(f.esg.sfdrArticle)
          )}
        >
          {formatSfdrArticle(f.esg.sfdrArticle)}
        </span>
      ),
    },
    {
      label: "ESG-Ansatz",
      getValue: (f) => f.esg.approach || "—",
    },
    {
      label: "Hauptausschlüsse",
      getValue: (f) =>
        f.esg.exclusions?.slice(0, 3).join(", ") || "—",
    },
    {
      label: "Volatilität (ann.)",
      getValue: (f) =>
        f.risk.volatility !== undefined ? (
          <span className="tabular-nums">{formatPercent(f.risk.volatility, 1)}</span>
        ) : "—",
      highlight: (f, all) => {
        const vols = all
          .map((x) => x.risk.volatility)
          .filter((v) => v !== undefined) as number[]
        if (vols.length < 2 || f.risk.volatility === undefined) return null
        if (f.risk.volatility === Math.min(...vols)) return "low"
        if (f.risk.volatility === Math.max(...vols)) return "high"
        return null
      },
    },
    {
      label: "Max. Drawdown",
      getValue: (f) =>
        f.risk.maxDrawdown !== undefined ? (
          <span className="tabular-nums">{formatPercent(f.risk.maxDrawdown, 1)}</span>
        ) : "—",
    },
    {
      label: "Active Share",
      getValue: (f) =>
        f.portfolio.activeShare !== undefined ? (
          <span className="tabular-nums">{formatPercent(f.portfolio.activeShare, 1)}</span>
        ) : "—",
    },
    {
      label: "Anzahl Positionen",
      getValue: (f) =>
        f.portfolio.numberOfPositions !== undefined
          ? <span className="tabular-nums">{f.portfolio.numberOfPositions}</span>
          : "—",
    },
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-800 text-white">
            {/* Sticky label column */}
            <th className="sticky left-0 bg-slate-800 z-10 px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-300 w-44">
              Kennzahl
            </th>
            {/* Primary fund */}
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider min-w-[180px]">
              <div className="space-y-0.5">
                <div className="text-white">{primaryFund.isin}</div>
                <div className="text-slate-400 font-normal text-xs truncate max-w-[160px]">
                  Primärfonds
                </div>
              </div>
            </th>
            {/* Peers */}
            {peers.map((peer) => (
              <th
                key={peer.isin}
                className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider min-w-[180px]"
              >
                <div className="space-y-0.5">
                  <div className="text-slate-300">{peer.isin}</div>
                  <div className="text-slate-500 font-normal text-xs truncate max-w-[160px]">
                    {peer.provider}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr
              key={row.label}
              className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
            >
              {/* Sticky label */}
              <td
                className={`sticky left-0 z-10 px-4 py-3 font-medium text-slate-600 text-xs whitespace-nowrap border-r border-slate-200 ${
                  rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"
                }`}
              >
                {row.label}
              </td>

              {/* Primary fund value */}
              <td className="px-4 py-3 text-slate-900 font-medium border-r border-slate-100">
                <HighlightedCell
                  value={row.getValue(primaryFund)}
                  highlight={row.highlight?.(primaryFund, allFunds) ?? null}
                />
              </td>

              {/* Peer values */}
              {peers.map((peer) => (
                <td
                  key={peer.isin}
                  className="px-4 py-3 text-slate-700 border-r border-slate-100 last:border-r-0"
                >
                  <HighlightedCell
                    value={row.getValue(peer)}
                    highlight={row.highlight?.(peer, allFunds) ?? null}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HighlightedCell({
  value,
  highlight,
}: {
  value: React.ReactNode
  highlight: "low" | "high" | null
}) {
  return (
    <div className="flex items-center gap-1.5">
      {highlight === "low" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      )}
      {highlight === "high" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
      )}
      <span>{value}</span>
    </div>
  )
}
