"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import type { FundData } from "@/lib/types/fund"

interface EsgRadarChartProps {
  primaryFund: FundData
  peers: FundData[]
}

/**
 * Maps fund data to a 0-100 radar score for each ESG/Risk dimension.
 */
function toRadarScore(fund: FundData): Record<string, number> {
  const sfdrScore = fund.esg.sfdrArticle === 9
    ? 100
    : fund.esg.sfdrArticle === 8
    ? 65
    : fund.esg.sfdrArticle === 6
    ? 30
    : 20

  const exclusionScore = Math.min((fund.esg.exclusions?.length ?? 0) * 10, 100)

  // Invert volatility: lower vol = higher score
  const volScore =
    fund.risk.volatility !== undefined
      ? Math.max(0, 100 - fund.risk.volatility * 5)
      : 50

  // Invert drawdown: shallower = higher score
  const drawdownScore =
    fund.risk.maxDrawdown !== undefined
      ? Math.max(0, 100 + fund.risk.maxDrawdown * 2)
      : 50

  const activeShareScore = fund.portfolio.activeShare ?? 50

  return {
    sfdrScore,
    exclusionScore,
    volScore: Math.round(volScore),
    drawdownScore: Math.round(drawdownScore),
    activeShareScore: Math.round(activeShareScore),
  }
}

const AXES = [
  { key: "sfdrScore", label: "SFDR-Klassif." },
  { key: "exclusionScore", label: "Ausschlüsse" },
  { key: "volScore", label: "Niedrig-Volatilität" },
  { key: "drawdownScore", label: "Drawdown-Schutz" },
  { key: "activeShareScore", label: "Active Share" },
]

const COLORS = ["#1e293b", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"]

export function EsgRadarChart({ primaryFund, peers }: EsgRadarChartProps) {
  const allFunds = [primaryFund, ...peers]

  const chartData = AXES.map(({ key, label }) => {
    const point: Record<string, string | number> = { subject: label }
    allFunds.forEach((fund) => {
      const scores = toRadarScore(fund)
      point[fund.isin] = scores[key]
    })
    return point
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData} margin={{ top: 8, right: 32, bottom: 8, left: 32 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          {allFunds.map((fund, i) => (
            <Radar
              key={fund.isin}
              name={fund.name.length > 20 ? fund.name.slice(0, 18) + "…" : fund.name}
              dataKey={fund.isin}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={i === 0 ? 0.2 : 0.05}
              strokeWidth={i === 0 ? 2 : 1.5}
            />
          ))}
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "none",
              borderRadius: "6px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", color: "#64748b" }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 text-center mt-1">
        Scores normalisiert (0-100). Höher = besser.
      </p>
    </div>
  )
}
