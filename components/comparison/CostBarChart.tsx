"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import type { FundData } from "@/lib/types/fund"

interface CostBarChartProps {
  primaryFund: FundData
  peers: FundData[]
}

const PRIMARY_COLOR = "#1e293b" // slate-800
const PEER_COLOR = "#94a3b8" // slate-400
const AVG_COLOR = "#f59e0b" // amber-500

export function CostBarChart({ primaryFund, peers }: CostBarChartProps) {
  const allFunds = [primaryFund, ...peers]

  const data = allFunds
    .filter((f) => f.costs.ter !== null)
    .map((f) => ({
      name:
        f.name.length > 18 ? f.name.slice(0, 16) + "…" : f.name,
      isin: f.isin,
      ter: f.costs.ter,
      isPrimary: f.isin === primaryFund.isin,
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Keine TER-Daten vorhanden
      </div>
    )
  }

  const avgTer =
    data.reduce((s, d) => s + (d.ter ?? 0), 0) / data.length

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="isin"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "TER"]}
            labelFormatter={(label) => {
              const fund = data.find((d) => d.isin === label)
              return fund?.name ?? label
            }}
            contentStyle={{
              background: "#1e293b",
              border: "none",
              borderRadius: "6px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            y={avgTer}
            stroke={AVG_COLOR}
            strokeDasharray="4 4"
            label={{
              value: `Ø ${avgTer.toFixed(2)}%`,
              position: "insideTopRight",
              fontSize: 11,
              fill: AVG_COLOR,
            }}
          />
          <Bar dataKey="ter" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry) => (
              <Cell
                key={entry.isin}
                fill={entry.isPrimary ? PRIMARY_COLOR : PEER_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-xs text-slate-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-800" />
          Primärfonds
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-slate-400" />
          Peers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-dashed border-amber-500" />
          Durchschnitt
        </span>
      </div>
    </div>
  )
}
