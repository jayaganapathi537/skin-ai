import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, RotateCcw, Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PaletteCard from '../components/PaletteCard'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } }),
}

export default function Share() {
  const navigate = useNavigate()
  const { profile, palette, reset } = useApp()
  const [copied, setCopied] = useState(false)

  if (!profile || !palette) {
    navigate('/')
    return null
  }

  const summaryText = [
    `Skin AI Colour Profile`,
    `Undertone: ${profile.undertone} · Depth: ${profile.depth} · Contrast: ${profile.contrast}`,
    ``,
    `Best colours: ${palette.hero_colors?.map((c) => c.name).join(', ')}`,
    `Neutrals: ${palette.neutral_colors?.map((c) => c.name).join(', ')}`,
    ``,
    `Discover your colours at skinai.app`,
  ].join('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = summaryText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleStartOver = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-canvas">
      <motion.div
        initial="hidden"
        animate="visible"
        className="px-4 sm:px-6 lg:px-8 py-8 max-w-[720px] mx-auto"
      >
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className="w-14 h-14 rounded-xl bg-accent/8 flex items-center justify-center mx-auto mb-4"
          >
            <Heart size={24} className="text-accent" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink mb-3">
            Your Colours
          </h1>
          <p className="text-sm text-ink-light leading-relaxed">
            Download your palette card or share your colour summary.
          </p>
        </motion.div>

        {/* Palette Card */}
        <motion.div
          variants={fadeUp}
          custom={1}
          className="mb-8"
        >
          <PaletteCard profile={profile} palette={palette} />
        </motion.div>

        {/* Summary card */}
        <motion.div
          variants={fadeUp}
          custom={2}
          className="bg-white/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 mb-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em]">Colour Summary</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
              style={{
                backgroundColor: copied ? 'rgb(91,140,106)' : 'transparent',
                color: copied ? 'white' : '#C4856B',
              }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
                    <Check size={14} />
                    Copied!
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
                    <Copy size={14} />
                    Copy
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          <div className="bg-canvas/80 rounded-2xl p-4 border border-border/30">
            <pre className="text-xs text-ink-light whitespace-pre-wrap font-sans leading-relaxed">
              {summaryText}
            </pre>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} custom={3} className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartOver}
            className="w-full flex items-center justify-center gap-2 py-4 text-base font-medium text-ink bg-white border border-border/60 rounded-2xl hover:border-ink/20 hover:shadow-md transition-all min-h-[52px]"
          >
            <RotateCcw size={16} />
            Analyse Another Photo
          </motion.button>
        </motion.div>

        <motion.p
          variants={fadeUp}
          custom={4}
          className="mt-8 text-xs text-ink text-center"
        >
          These results are estimates and a styling guide. Lighting and other factors may affect accuracy.
        </motion.p>
      </motion.div>
    </div>
  )
}
