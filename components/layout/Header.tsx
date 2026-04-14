import { TrendingUp } from "lucide-react"
import Link from "next/link"

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 group-hover:bg-slate-700 transition-colors">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm">FondsAnalyse</span>
            <span className="text-slate-400 text-sm"> Pro</span>
          </div>
        </Link>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>Powered by</span>
          <span className="font-semibold text-slate-600">Claude AI</span>
        </div>
      </div>
    </header>
  )
}
