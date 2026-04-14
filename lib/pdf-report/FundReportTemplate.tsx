import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { ComparisonResult, PunchyStatement, FundData } from "@/lib/types/fund"
import { formatPercent, formatAum, formatDate, formatSfdrArticle } from "@/lib/utils/formatters"

// PDF color palette (Slate/Zinc FinTech style)
const COLORS = {
  primary: "#1e293b",    // slate-800
  secondary: "#475569",  // slate-600
  muted: "#94a3b8",      // slate-400
  border: "#e2e8f0",     // slate-200
  background: "#f8fafc", // slate-50
  white: "#ffffff",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#64748b",
  info: "#3b82f6",
}

const CATEGORY_LABELS: Record<string, string> = {
  cost: "KOSTEN",
  esg: "ESG",
  risk: "RISIKO",
  portfolio: "PORTFOLIO",
  general: "ALLGEMEIN",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.primary,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 36,
    backgroundColor: COLORS.white,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 9,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 7,
    color: COLORS.muted,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Section
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  // Table
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableHeaderCell: {
    color: COLORS.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    fontSize: 7.5,
    color: COLORS.primary,
  },
  tableCellMuted: {
    fontSize: 7,
    color: COLORS.muted,
  },
  // Statement
  statement: {
    flexDirection: "row",
    marginBottom: 5,
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
  },
  statementPositive: {
    backgroundColor: "#f0fdf4",
    borderLeftColor: COLORS.emerald,
  },
  statementNegative: {
    backgroundColor: "#fff1f2",
    borderLeftColor: COLORS.red,
  },
  statementNeutral: {
    backgroundColor: COLORS.background,
    borderLeftColor: COLORS.muted,
  },
  statementInfo: {
    backgroundColor: "#eff6ff",
    borderLeftColor: COLORS.blue,
  },
  statementCategory: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statementText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    lineHeight: 1.3,
  },
  statementDataPoint: {
    fontSize: 6.5,
    color: COLORS.secondary,
  },
  // Grid
  grid2: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  // KPIs
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  kpiBox: {
    flex: 1,
    padding: 6,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: {
    fontSize: 6,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  kpiSub: {
    fontSize: 6.5,
    color: COLORS.secondary,
    marginTop: 1,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: COLORS.muted,
  },
})

function StatementBlock({ stmt }: { stmt: PunchyStatement }) {
  const styleMap = {
    positive: styles.statementPositive,
    negative: styles.statementNegative,
    neutral: styles.statementNeutral,
    info: styles.statementInfo,
  }
  const color = SENTIMENT_COLORS[stmt.sentiment]

  return (
    <View style={[styles.statement, styleMap[stmt.sentiment]]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statementCategory, { color }]}>
          {CATEGORY_LABELS[stmt.category] ?? stmt.category}
        </Text>
        <Text style={styles.statementText}>{stmt.statement}</Text>
        {stmt.dataPoints.slice(0, 2).map((dp, i) => (
          <Text key={i} style={styles.statementDataPoint}>
            • {dp}
          </Text>
        ))}
      </View>
    </View>
  )
}

function MetricRow({
  label,
  values,
  isPrimaryBold,
}: {
  label: string
  values: string[]
  isPrimaryBold?: boolean
}) {
  const colWidth = `${100 / (values.length + 1)}%`

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, { width: "30%" }]}>{label}</Text>
      {values.map((val, i) => (
        <Text
          key={i}
          style={[
            styles.tableCell,
            { flex: 1 },
            i === 0 && isPrimaryBold ? { fontFamily: "Helvetica-Bold" } : {},
          ]}
        >
          {val}
        </Text>
      ))}
    </View>
  )
}

export function FundReportDocument({ result }: { result: ComparisonResult }) {
  const { primaryFund, peers, statements, generatedAt } = result
  const allFunds = [primaryFund, ...peers]

  const METRICS: { label: string; getValue: (f: FundData) => string }[] = [
    { label: "TER", getValue: (f) => formatPercent(f.costs.ter) },
    { label: "Management Fee", getValue: (f) => formatPercent(f.costs.managementFee) },
    { label: "Performance Fee", getValue: (f) => f.costs.performanceFee !== null ? formatPercent(f.costs.performanceFee) : "Keine" },
    { label: "SFDR-Klassif.", getValue: (f) => formatSfdrArticle(f.esg.sfdrArticle) },
    { label: "ESG-Ansatz", getValue: (f) => f.esg.approach ?? "—" },
    { label: "Volatilität", getValue: (f) => f.risk.volatility !== undefined ? formatPercent(f.risk.volatility, 1) : "—" },
    { label: "Max. Drawdown", getValue: (f) => f.risk.maxDrawdown !== undefined ? formatPercent(f.risk.maxDrawdown, 1) : "—" },
    { label: "Active Share", getValue: (f) => f.portfolio.activeShare !== undefined ? formatPercent(f.portfolio.activeShare, 1) : "—" },
    { label: "AuM", getValue: (f) => formatAum(f.aum, f.currency) },
  ]

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{primaryFund.name}</Text>
            <Text style={styles.headerSubtitle}>
              {primaryFund.isin} · {primaryFund.provider} · Verglichen mit {peers.length} Peer{peers.length !== 1 ? "s" : ""}
            </Text>
            <Text style={styles.headerMeta}>
              Peers: {peers.map((p) => `${p.name} (${p.isin})`).join(" | ")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.badge}>Fondsvergleich</Text>
            <Text style={[styles.headerMeta, { marginTop: 4 }]}>
              {formatDate(generatedAt)}
            </Text>
          </View>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          {[
            { label: "TER", value: formatPercent(primaryFund.costs.ter) },
            { label: "SFDR", value: formatSfdrArticle(primaryFund.esg.sfdrArticle) },
            { label: "Volatilität", value: primaryFund.risk.volatility !== undefined ? formatPercent(primaryFund.risk.volatility, 1) : "—" },
            { label: "AuM", value: formatAum(primaryFund.aum, primaryFund.currency) },
            { label: "Active Share", value: primaryFund.portfolio.activeShare !== undefined ? formatPercent(primaryFund.portfolio.activeShare, 1) : "—" },
          ].map((kpi) => (
            <View key={kpi.label} style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiSub}>Primärfonds</Text>
            </View>
          ))}
        </View>

        <View style={styles.grid2}>
          {/* Left: Statements */}
          <View style={[styles.col, { flex: 1.1 }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Findings</Text>
              {statements.slice(0, 6).map((stmt, i) => (
                <StatementBlock key={i} stmt={stmt} />
              ))}
            </View>
          </View>

          {/* Right: Comparison Table */}
          <View style={[styles.col, { flex: 1.4 }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kennzahlenvergleich</Text>
              <View style={styles.table}>
                {/* Table header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Kennzahl</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                    {primaryFund.isin} (Primär)
                  </Text>
                  {peers.slice(0, 3).map((peer) => (
                    <Text key={peer.isin} style={[styles.tableHeaderCell, { flex: 1 }]}>
                      {peer.isin}
                    </Text>
                  ))}
                </View>
                {/* Rows */}
                {METRICS.map((metric, i) => (
                  <View
                    key={metric.label}
                    style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                  >
                    <Text style={[styles.tableCellMuted, { width: "30%" }]}>
                      {metric.label}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>
                      {metric.getValue(primaryFund)}
                    </Text>
                    {peers.slice(0, 3).map((peer) => (
                      <Text key={peer.isin} style={[styles.tableCell, { flex: 1 }]}>
                        {metric.getValue(peer)}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>

            {/* Top Holdings */}
            {primaryFund.portfolio.top10Holdings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Top Holdings — {primaryFund.name}
                </Text>
                <View style={styles.table}>
                  {primaryFund.portfolio.top10Holdings.slice(0, 5).map((h, i) => (
                    <View
                      key={i}
                      style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
                    >
                      <Text style={[styles.tableCellMuted, { width: "8%" }]}>
                        {(i + 1).toString().padStart(2, "0")}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{h.name}</Text>
                      <Text style={[styles.tableCell, { width: "14%", textAlign: "right" }]}>
                        {h.weight.toFixed(2)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            FondsAnalyse Pro · Erstellt am {formatDate(generatedAt)}
          </Text>
          <Text style={styles.footerText}>
            Vertraulich · Nur für professionelle Investoren
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Seite ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
