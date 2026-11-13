import { Bot, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react'
import type { AiText } from '../lib/types'
import { AiDisclaimer, Badge, Button } from './ui'

export function AiInsightCard({
  title,
  insight,
  source,
  notice,
  loading,
  onGenerate,
  generateLabel,
}: {
  title: string
  insight: AiText | null
  source: 'ai' | 'fallback' | null
  notice?: string
  loading: boolean
  onGenerate: () => void
  generateLabel: string
}) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-brand-900">
          <Sparkles className="size-4 text-accent-500" /> {title}
        </h2>
        <div className="flex items-center gap-2">
          {source && <Badge tone={source === 'ai' ? 'good' : 'warn'}>{source === 'ai' ? <><Bot className="size-3" /> Gemini AI</> : 'Penjelasan otomatis'}</Badge>}
          <Button size="sm" variant={insight ? 'outline' : 'primary'} loading={loading} onClick={onGenerate} icon={insight ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}>
            {insight ? 'Buat ulang' : generateLabel}
          </Button>
        </div>
      </div>
      {notice && <p className="mt-2 text-xs font-medium text-amber-700">{notice}</p>}
      {loading && !insight && (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      )}
      {insight && (
        <div className="fade-in mt-3">
          <p className="leading-relaxed text-stone-800">{insight.summary}</p>
          <ul className="mt-3 space-y-2">
            {insight.actions.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-stone-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" /> {a}
              </li>
            ))}
          </ul>
          <div className="mt-3"><AiDisclaimer /></div>
        </div>
      )}
      {!insight && !loading && <p className="mt-2 text-sm text-stone-600">Klik tombol untuk meminta AI menjelaskan angka di atas dalam bahasa sederhana.</p>}
    </div>
  )
}
