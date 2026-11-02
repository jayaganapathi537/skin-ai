import { motion } from 'framer-motion'

export default function SwatchChip({ color, label, size = 'md', className = '' }) {
  const sizes = {
    sm: { chip: 'w-8 h-8 rounded-lg', ring: 'ring-1', shadow: '0 2px 8px' },
    md: { chip: 'w-12 h-12 rounded-xl', ring: 'ring-1', shadow: '0 3px 12px' },
    lg: { chip: 'w-16 h-16 rounded-2xl', ring: 'ring-[1.5px]', shadow: '0 4px 16px' },
    xl: { chip: 'w-20 h-20 rounded-2xl', ring: 'ring-2', shadow: '0 6px 20px' },
  }

  const s = sizes[size] || sizes.md

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 ${className}`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <div
        className={`${s.chip} ${s.ring} ring-white/60 relative overflow-hidden cursor-default`}
        style={{
          backgroundColor: color,
          boxShadow: `${s.shadow} ${color}40, inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.08)`,
        }}
        title={`${label}: ${color}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
      </div>
      {label && (
        <span className="text-[11px] font-medium text-ink-light text-center leading-tight tracking-wide">
          {label}
        </span>
      )}
    </motion.div>
  )
}
