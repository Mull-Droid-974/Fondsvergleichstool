"use client"

import { useRouter } from "next/navigation"
import { IsinForm } from "@/components/fund-input/IsinForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Leaf, Shield, FileDown } from "lucide-react"

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Kosten-Analyse",
    description: "TER, Management- und Performance-Fees im direkten Vergleich",
  },
  {
    icon: Leaf,
    title: "ESG-Profil",
    description: "SFDR-Klassifizierung (Art. 8/9), Ausschlüsse und Nachhaltigkeits-Ansatz",
  },
  {
    icon: Shield,
    title: "Risikokennzahlen",
    description: "Volatilität, Max. Drawdown, Active Share und Sharpe Ratio",
  },
  {
    icon: FileDown,
    title: "PDF-Export",
    description: "Professioneller One-Pager mit KI-generierten Verkaufsargumenten",
  },
]

export default function HomePage() {
  const router = useRouter()

  function handleSubmit(primaryIsin: string, peerIsins: string[]) {
    const params = new URLSearchParams()
    params.set("primary", primaryIsin)
    peerIsins.forEach((isin) => params.append("peer", isin))
    router.push(`/compare?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: Hero */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0">
                KI-gestützter Fondsvergleich
              </Badge>
              <h1 className="text-4xl font-bold text-slate-900 leading-tight">
                Fundierte Verkaufsargumente.{" "}
                <span className="text-slate-500">In Sekunden.</span>
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed">
                Vergleichen Sie Ihren Fonds mit bis zu 5 Peers anhand von
                Kosten, ESG-Profil und Risikokennzahlen. Die KI extrahiert
                die Daten direkt aus den Factsheets und generiert prägnante
                Aussagen für Ihre nächste Kundenpräsentation.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-800">
                        {feature.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Data source note */}
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
              Factsheets werden automatisch von fundinfo.com bezogen.
              Bei blockierten Downloads können PDFs manuell hochgeladen werden.
              Alle Daten werden lokal verarbeitet und nicht dauerhaft gespeichert.
            </p>
          </div>

          {/* Right: Form */}
          <div>
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-slate-900">
                  ISINs eingeben
                </CardTitle>
                <CardDescription>
                  Geben Sie die ISIN Ihres Fonds und bis zu 5 Peer-Fonds ein.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IsinForm onSubmit={handleSubmit} />
              </CardContent>
            </Card>

            {/* Example ISINs */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-2">
                Beispiel-ISINs zum Testen:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "CH0012221716",
                  "LU0823421906",
                  "IE00B4L5Y983",
                  "LU0274208692",
                ].map((isin) => (
                  <code
                    key={isin}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 font-mono text-slate-700"
                  >
                    {isin}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
