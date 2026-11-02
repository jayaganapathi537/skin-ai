import { useState } from 'react'
import { motion } from 'framer-motion'
import MatchBadge from './MatchBadge'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function PlaceholderSVG({ hex }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative">
        <div className="w-12 h-[2px] mx-auto mb-0 rounded-full" style={{ backgroundColor: hex + '50' }} />
        <svg viewBox="0 0 80 100" className="w-20 h-24 drop-shadow-sm">
          <path
            d="M28 8 C28 8 32 0 40 0 C48 0 52 8 52 8 L56 14 L72 24 C74 25 74 28 72 29 L56 29 L58 90 C58 94 54 98 50 98 L30 98 C26 98 22 94 22 90 L24 29 L8 29 C6 28 6 25 8 24 L24 14 Z"
            fill={hex}
            opacity="0.85"
          />
          <path
            d="M28 8 C28 8 32 0 40 0 C48 0 52 8 52 8 L56 14 L72 24 C74 25 74 28 72 29 L56 29 L58 90 C58 94 54 98 50 98 L30 98 C26 98 22 94 22 90 L24 29 L8 29 C6 28 6 25 8 24 L24 14 Z"
            fill="url(#sheen)"
            opacity="0.3"
          />
          <defs>
            <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}

export default function GarmentCard({ garment, onTryOn }) {
  const matchLevel = garment.match_score >= 75 ? 'great' : garment.match_score >= 50 ? 'good' : 'okay'
  const hex = garment.dominant_hex
  const [imgFailed, setImgFailed] = useState(false)
  const hasTryon = Boolean(garment.tryon_image)

  const thumbSrc = garment.image && !imgFailed
    ? (garment.image.startsWith('http') ? garment.image : `${API_BASE}${garment.image}`)
    : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-accent/30 transition-all duration-300"
    >
      <div
        className="aspect-[3/4] relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${hex}15 0%, ${hex}30 50%, ${hex}18 100%)`,
        }}
      >
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={garment.name}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <PlaceholderSVG hex={hex} />
        )}

        <div className="absolute top-2.5 right-2.5">
          <MatchBadge level={matchLevel} />
        </div>

        {hasTryon && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-accent/90 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
            Try-On
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-3.5 space-y-2.5">
        <div>
          <h3 className="text-sm font-semibold text-ink truncate">{garment.name}</h3>
          <p className="text-[11px] text-ink tracking-wide uppercase">{garment.category}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-ink block">{garment.price}</span>
            <span className="text-[10px] text-ink">Demo price</span>
          </div>
          <motion.button
            whileHover={hasTryon ? { scale: 1.04 } : {}}
            whileTap={hasTryon ? { scale: 0.96 } : {}}
            onClick={() => hasTryon && onTryOn(garment)}
            disabled={!hasTryon}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[32px] ${
              hasTryon
                ? 'text-white bg-accent-dark hover:bg-[#5A6D62] cursor-pointer'
                : 'text-ink-light/50 bg-border/40 cursor-not-allowed'
            }`}
          >
            {hasTryon ? 'Try It On' : 'View Only'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
