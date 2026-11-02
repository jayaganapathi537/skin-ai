import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Toast from '../components/Toast'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } }),
}

const HAIR_OPTIONS = ['Black', 'Brown', 'Blonde', 'Auburn', 'Red', 'Grey/White']
const EYE_OPTIONS = ['Brown', 'Blue', 'Green', 'Gray', 'Amber']

const HAIR_HEX = {
  Black: '#1A1110', Brown: '#3B2F2F', Blonde: '#C8A070',
  Auburn: '#6A3B2A', Red: '#8B2500', 'Grey/White': '#A0A0A0',
}
const EYE_HEX = {
  Brown: '#6B4226', Blue: '#4A7FA5', Green: '#4E7D5B',
  Gray: '#808080', Amber: '#C87820',
}

function DetectedSwatch({ color, label, delay, onCopy }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 300, damping: 20 }}
      className="flex flex-col items-center gap-2 min-w-0"
    >
      <button
        onClick={() => onCopy(color, label)}
        title={`Copy ${color}`}
        className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl shadow-lg transition-transform hover:scale-110 active:scale-95 duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          backgroundColor: color,
          boxShadow: `0 8px 24px ${color}40`,
        }}
      />
      <span className="text-xs font-medium text-ink-light text-center">{label}</span>
    </motion.div>
  )
}

function StatCard({ label, value, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2 }}
      className="bg-surface rounded-xl border border-border p-4 text-center shadow-sm hover:shadow-md transition-all duration-300"
    >
      <p className="text-xs font-semibold text-ink-light uppercase tracking-wider mb-2">{label}</p>
      <p className="text-base font-semibold text-ink leading-tight">{value}</p>
    </motion.div>
  )
}

function SpectrumBar({ position, undertoneLabel }) {
  const pct = Math.round(position * 100)
  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <p className="text-xs font-semibold text-ink-light uppercase tracking-wider mb-2">Undertone Spectrum</p>
      <p className="text-base font-semibold text-ink mb-3">{undertoneLabel}</p>
      <div className="relative h-3 rounded-full overflow-hidden" style={{
        background: 'linear-gradient(to right, #8FA9C1, #C4B5A6, #D9B97A)',
      }}>
        <motion.div
          initial={{ left: '50%' }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-white shadow-lg"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-ink">Cool</span>
        <span className="text-xs text-ink">Neutral</span>
        <span className="text-xs text-ink">Warm</span>
      </div>
    </div>
  )
}

function PhotoQualityChip({ quality }) {
  if (!quality) return null
  const { label, reasons, suggest_retake: retake } = quality
  const color = label === 'Good' ? 'text-success' : label === 'Fair' ? 'text-warning' : 'text-error'
  const bg = label === 'Good' ? 'bg-success/10' : label === 'Fair' ? 'bg-warning/10' : 'bg-error/10'
  const Icon = label === 'Good' ? CheckCircle : label === 'Fair' ? Info : AlertTriangle

  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className={`text-xs font-semibold ${color}`}>Photo quality: {label}</span>
      </div>
      {retake && (
        <p className="text-xs text-ink-light mt-1">Retake in better lighting for more accurate results.</p>
      )}
      {reasons && reasons.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-[11px] text-ink-light/70">• {r}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CorrectionChips({ label, options, current, onSelect }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors min-h-[32px] ${
              current === opt
                ? 'bg-accent text-white border-accent'
                : 'bg-white text-ink-light border-border hover:border-accent'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { profile, setProfile, setPalette, isDemo } = useApp()
  const [correctedHair, setCorrectedHair] = useState(null)
  const [correctedEyes, setCorrectedEyes] = useState(null)
  const [recomputing, setRecomputing] = useState(false)
  const [toast, setToast] = useState(null)

  const copyColor = useCallback((hex, label) => {
    navigator.clipboard.writeText(hex.toUpperCase()).then(() => {
      setToast(`Copied ${label} ${hex.toUpperCase()}`)
    })
  }, [])

  if (!profile) {
    navigate('/')
    return null
  }

  const handleCorrection = useCallback(async (hairOpt, eyeOpt) => {
    setRecomputing(true)
    try {
      const corrected = {
        skin_color: profile.skin_color,
        eye_color: eyeOpt ? EYE_HEX[eyeOpt] : profile.eye_color,
        eye_color_name: eyeOpt || profile.eye_color_name,
        lip_color: profile.lip_color,
        eyebrow_color: profile.eyebrow_color,
        hair_color: hairOpt ? HAIR_HEX[hairOpt] : profile.hair_color,
        hair_color_name: hairOpt || profile.hair_color_name,
      }

      const resp = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/recompute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corrected),
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        setProfile(data.profile)
        setPalette(data.palette)
      }
    } catch {
      // Silently fail — corrections are optional
    } finally {
      setRecomputing(false)
    }
  }, [profile, setProfile, setPalette])

  const onHairCorrect = (opt) => {
    setCorrectedHair(opt)
    handleCorrection(opt, correctedEyes)
  }

  const onEyeCorrect = (opt) => {
    setCorrectedEyes(opt)
    handleCorrection(correctedHair, opt)
  }

  const detected = [
    { label: 'Skin', color: profile.skin_color },
    { label: 'Eyes', color: profile.eye_color },
    { label: 'Lips', color: profile.lip_color },
    { label: 'Brows', color: profile.eyebrow_color },
    { label: 'Hair', color: profile.hair_color },
  ]

  const pq = profile.photo_quality
  const isLowQuality = pq && pq.suggest_retake
  const leanUnclear = profile.lean === 'balanced' && profile.undertone_raw === 'neutral'

  return (
    <div className="min-h-screen bg-canvas">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4 sm:px-6 lg:px-8 py-8 max-w-[720px] mx-auto"
      >
        {/* Navigation - Keep demo badge */}
        <div className="flex items-center justify-end mb-8">

          {isDemo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1.5 bg-surface border border-accent/15 text-accent text-xs font-medium rounded-lg shadow-sm"
            >
              Sample Profile
            </motion.div>
          )}
        </div>

        {/* Title */}
        <motion.div initial="hidden" animate="visible">
          <motion.h1 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-semibold text-ink mb-3">
            Your Colour Profile
          </motion.h1>

          {/* Summary */}
          <motion.div variants={fadeUp} custom={1} className="border-l-2 border-accent/30 pl-4 mb-10">
            <p className={`text-sm leading-relaxed italic ${isLowQuality || leanUnclear ? 'text-ink-light' : 'text-ink-light'}`}>
              {profile.summary}
            </p>
          </motion.div>
        </motion.div>

        {/* F.13: Detected colours — grid-cols-5 with proper overflow handling */}
        <motion.div
          initial="hidden"
          animate="visible"
          className="bg-white/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 sm:p-8 mb-6 shadow-sm"
        >
          <motion.p variants={fadeUp} custom={2} className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em] mb-6 text-center">
            Detected Colours
          </motion.p>
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {detected.map((d, i) => (
              <DetectedSwatch key={d.label} color={d.color} label={d.label} delay={0.3 + i * 0.1} onCopy={copyColor} />
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Undertone" value={profile.undertone} delay={0.8} />
          <StatCard label="Depth" value={profile.depth} delay={0.9} />
          <StatCard label="Contrast" value={profile.contrast} delay={1.0} />
        </div>

        {/* F.14: Spectrum bar replaces confidence ring */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mb-4"
        >
          <SpectrumBar
            position={profile.spectrum_position ?? 0.5}
            undertoneLabel={profile.undertone}
          />
        </motion.div>

        {/* F.14: Photo quality chip */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-6"
        >
          <PhotoQualityChip quality={pq} />
        </motion.div>

        {/* F.15: Correction chips */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/50 p-5 mb-8 shadow-sm"
        >
          <p className="text-[10px] font-semibold text-ink-light/60 uppercase tracking-[0.12em] mb-4">
            Does this look right?
          </p>
          <div className="space-y-4">
            <CorrectionChips
              label="Hair colour"
              options={HAIR_OPTIONS}
              current={correctedHair || profile.hair_color_name}
              onSelect={onHairCorrect}
            />
            <CorrectionChips
              label="Eye colour"
              options={EYE_OPTIONS}
              current={correctedEyes || profile.eye_color_name}
              onSelect={onEyeCorrect}
            />
          </div>
          {recomputing && (
            <p className="text-xs text-accent mt-3 animate-pulse">Recomputing your profile…</p>
          )}
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(196,133,107,0.25)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/palette')}
          className="w-full flex items-center justify-center gap-2 py-4 text-base font-medium text-white bg-accent hover:bg-accent-dark rounded-xl min-h-[52px] transition-all"
        >
          See Your Palette
          <ArrowRight size={18} />
        </motion.button>

        {/* F.16: Disclaimer with 4.5:1 contrast */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-6 text-[11px] text-center"
          style={{ color: '#78716C' }}
        >
          These results are estimates and a styling guide. Lighting and other factors may affect accuracy.
        </motion.p>
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
