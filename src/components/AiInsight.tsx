import { Fragment } from 'react'
import { CheckCircle2, Lightbulb, MessageSquareText, RefreshCw } from 'lucide-react'
import type { AiText } from '../lib/types'
import { AiDisclaimer, Badge, Button } from './ui'

// Tebalkan angka penting (porsi, Rp, %, hari) agar kesimpulan mudah dipindai
const HIGHLIGHT = /(Rp\s?[\d.]+(?:,\d+)?|\d[\d.,]*\s?(?:porsi|%|kkal|menu|kg)|\b(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\b)/g

function Emphasis({ text }: { text: string }) {
  const parts = text.split(HIGHLIGHT)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-brand-900">{p}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}

/** Pecah ringkasan menjadi poin per kalimat (tanpa memecah angka seperti "Rp 1.500" atau "2,5"). */
export function toPoints(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((t) => t.trim().replace(/\.$/, ''))
    .filter(Boolean)
}

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
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-gradient-to-r from-accent-50 to-amber-50/40 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2.5 font-bold text-stone-900">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-500 text-white"><Lightbulb className="size-5" /></span>
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {source && <Badge tone={source === 'ai' ? 'good' : 'warn'}>{source === 'ai' ? 'Analisis Gemini' : 'Penjelasan otomatis'}</Badge>}
          <Button size="sm" variant={insight ? 'outline' : 'accent'} loading={loading} onClick={onGenerate} icon={insight ? <RefreshCw className="size-4" /> : <MessageSquareText className="size-4" />}>
            {insight ? 'Buat ulang' : generateLabel}
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {notice && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{notice}</p>}

        {loading && !insight && (
          <div className="space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        )}

        {insight && (
          <div className="fade-in space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-stone-500 uppercase">Ringkasan</p>
              <ul className="space-y-2">
                {toPoints(insight.summary).map((p) => (
                  <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-stone-700">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-500" />
                    <span><Emphasis text={p} /></span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-brand-50/70 p-3.5">
              <p className="mb-2 text-xs font-bold tracking-wide text-brand-800 uppercase">Yang bisa dilakukan</p>
              <ul className="space-y-2">
                {insight.actions.map((a) => (
                  <li key={a} className="flex gap-2.5 text-sm text-stone-800">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    <span><Emphasis text={a} /></span>
                  </li>
                ))}
              </ul>
            </div>
            <AiDisclaimer />
          </div>
        )}

        {!insight && !loading && (
          <p className="text-sm text-stone-600">Tekan <b>{generateLabel}</b> untuk mendapatkan ringkasan dalam bahasa sederhana dan saran yang bisa langsung dilakukan.</p>
        )}
      </div>
    </div>
  )
}
