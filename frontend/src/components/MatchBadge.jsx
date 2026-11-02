import { Star, Check, Circle } from 'lucide-react'

const LEVELS = {
  great: {
    classes: 'bg-gradient-to-r from-success to-emerald-500 text-white shadow-sm shadow-success/20',
    icon: Star,
    label: 'Great',
  },
  good: {
    classes: 'bg-gradient-to-r from-warning to-amber-400 text-white shadow-sm shadow-warning/20',
    icon: Check,
    label: 'Good',
  },
  okay: {
    classes: 'bg-border text-ink-lighter',
    icon: Circle,
    label: 'Okay',
  },
}

export default function MatchBadge({ level }) {
  const config = LEVELS[level] || LEVELS.okay
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${config.classes}`}
    >
      <Icon size={10} strokeWidth={2.5} />
      {config.label}
    </span>
  )
}
