import { cn } from './ui'

// Warna avatar menu ditentukan dari nama agar konsisten di setiap halaman
const PALETTE = [
  'bg-brand-100 text-brand-800',
  'bg-accent-100 text-accent-700',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-800',
  'bg-teal-100 text-teal-800',
]

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function menuColor(name: string) {
  return PALETTE[hash(name) % PALETTE.length]
}

export function MenuAvatar({ name, photo, className }: { name: string; photo?: string | null; className?: string }) {
  if (photo) {
    return <img src={photo} alt={name} className={cn('size-11 shrink-0 rounded-2xl object-cover ring-1 ring-black/5', className)} />
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-extrabold', menuColor(name), className)} aria-hidden>
      {initials || '?'}
    </span>
  )
}
