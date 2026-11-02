import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Download, ChevronLeft, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PaletteCard from '../components/PaletteCard'
import Toast from '../components/Toast'
import { useState, useCallback } from 'react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
}

function HeroChip({ hex, name, reason, index, onCopy, onShowDetails }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
      className="flex flex-col items-center gap-2"
    >
      <motion.button
        whileHover={{ scale: 1.1, y: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onShowDetails({ hex, name, reason })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onShowDetails({ hex, name, reason })
          }
        }}
        aria-label={`${name} - tap for details`}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-md cursor-pointer transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          backgroundColor: hex,
          boxShadow: `0 4px 16px ${hex}30`,
        }}
      />
      <span className="text-[10px] sm:text-[11px] font-medium text-ink text-center leading-tight max-w-[70px]">{name}</span>
    </motion.div>
  )
}

function NeutralStrip({ colors, onCopy }) {
  return (
    <div className="flex gap-3 justify-center">
      {colors?.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + i * 0.08 }}
          className="flex flex-col items-center gap-2"
        >
          <button
            onClick={() => onCopy(c.hex, c.name)}
            title={`Copy ${c.hex}`}
            className="w-12 h-12 rounded-xl shadow-sm border border-black/5 hover:scale-110 hover:-translate-y-1 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{ backgroundColor: c.hex }}
          />
          <span className="text-[10px] text-ink-light">{c.name}</span>
        </motion.div>
      ))}
    </div>
  )
}

export default function Palette() {
  const navigate = useNavigate()
  const { profile, palette } = useApp()
  const [showCard, setShowCard] = useState(false)
  const [toast, setToast] = useState(null)
  const [colorDetails, setColorDetails] = useState(null)

  const copyColor = useCallback((hex, name) => {
    navigator.clipboard.writeText(hex.toUpperCase()).then(() => {
      setToast(`Copied ${name} ${hex.toUpperCase()}`)
    })
  }, [])

  const showColorDetails = useCallback((details) => {
    setColorDetails(details)
  }, [])

  if (!palette) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-canvas">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4 sm:px-6 lg:px-8 py-8 max-w-[720px] mx-auto"
      >

        <motion.div initial="hidden" animate="visible">
          <motion.h1 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-semibold text-ink mb-3">
            Your Palette
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="text-sm text-ink-light mb-10 leading-relaxed">
            Colours curated for your <span className="font-medium text-ink">{profile?.undertone?.toLowerCase()} {profile?.depth?.toLowerCase()}</span> colouring.
          </motion.p>
        </motion.div>

        {/* Best Colours */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="bg-surface rounded-2xl border border-border p-6 mb-4 shadow-sm"
        >
          <motion.div variants={fadeUp} custom={2} className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-accent uppercase tracking-wider">Your Best Colours</h2>
            <span className="text-xs text-ink">Tap a colour for details</span>
          </motion.div>
          <div className="grid grid-cols-5 gap-4 justify-items-center">
            {palette.hero_colors?.slice(0, 10).map((c, i) => (
              <HeroChip key={i} hex={c.hex} name={c.name} reason={c.reason} index={i} onCopy={copyColor} onShowDetails={showColorDetails} />
            ))}
          </div>
        </motion.div>

        {/* Neutrals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-surface rounded-2xl border border-border p-6 mb-4 shadow-sm"
        >
          <h2 className="text-xs font-semibold text-accent uppercase tracking-wider mb-5 text-center">Your Neutrals</h2>
          <NeutralStrip colors={palette.neutral_colors} onCopy={copyColor} />
        </motion.div>

        {/* Wear With Care */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-warning/5 rounded-2xl border border-warning/20 p-6 mb-10"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-warning" />
            <h2 className="text-xs font-semibold text-warning uppercase tracking-wider">Wear With Care</h2>
          </div>
          <p className="text-xs text-ink mb-4 ml-[22px]">These may be less flattering near your face — try them further away.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {palette.care_colors?.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + i * 0.08 }}
                className="flex flex-col items-center gap-2"
              >
                <button
                  onClick={() => copyColor(c.hex, c.name)}
                  title={c.reason || `Copy ${c.hex}`}
                  className="w-12 h-12 rounded-xl shadow-sm border border-black/5 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[10px] text-ink">{c.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCard(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-ink bg-surface border border-border hover:border-accent/30 rounded-xl hover:shadow-sm transition-all"
          >
            <Download size={16} />
            Download Card
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/shop')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl transition-all"
          >
            Shop Your Palette
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>

        {/* Color Details Modal */}
        <AnimatePresence>
          {colorDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-6"
              onClick={() => setColorDetails(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-2xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: colorDetails.hex }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{colorDetails.name}</h3>
                    <p className="text-sm text-ink-light font-mono">{colorDetails.hex.toUpperCase()}</p>
                  </div>
                </div>
                {colorDetails.reason && (
                  <p className="text-sm text-ink leading-relaxed mb-4">{colorDetails.reason}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      copyColor(colorDetails.hex, colorDetails.name)
                      setColorDetails(null)
                    }}
                    className="flex-1 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl transition-all"
                  >
                    Copy Hex
                  </button>
                  <button
                    onClick={() => setColorDetails(null)}
                    className="flex-1 py-3 text-sm font-medium text-ink bg-muted hover:bg-border rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Card Modal */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
              onClick={() => setShowCard(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-sm w-full"
              >
                <PaletteCard profile={profile} palette={palette} onDownload={() => setShowCard(false)} />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCard(false)}
                  className="mt-4 w-full py-3 text-sm font-medium text-white/80 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl hover:bg-white/20 transition-colors"
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-ink text-center">
          These results are estimates and a styling guide. Lighting and other factors may affect accuracy.
        </p>
      </motion.div>

      <Toast
        message={toast}
        type="success"
        visible={!!toast}
        duration={2000}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
