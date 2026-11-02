import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { analyzeImage, AllowanceError } from '../api/client'
import ErrorCard from '../components/ErrorCard'
import AllowanceExhausted from '../components/AllowanceExhausted'

const STEPS = [
  'Uploading your photo',
  'Reading your colours',
  'Building your palette',
]

const FUN_FACTS = [
  'Your skin undertone stays consistent regardless of tanning.',
  'The right colours can make you look more rested and vibrant.',
  'Seasonal colour analysis was popularised in the 1980s.',
  'Your eye colour helps determine which jewel tones suit you.',
  'Wearing your best colours near your face has the most impact.',
]

export default function Analyzing() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, capturedFile, setProfile, setPalette, setCatalogItems } = useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(null)
  const [allowanceError, setAllowanceError] = useState(null)
  const [factIndex, setFactIndex] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (location.state?.immediate && profile) {
      setCurrentStep(1)
      setTimeout(() => setCurrentStep(2), 800)
      setTimeout(() => navigate('/profile'), 1600)
      return
    }

    if (!capturedFile) {
      navigate('/capture')
      return
    }

    const run = async () => {
      try {
        setTimeout(() => setCurrentStep(1), 2000)

        console.log('[Analyzing] calling API...')
        const data = await analyzeImage(capturedFile)
        console.log('[Analyzing] API response:', data)
        setProfile(data.profile)
        setPalette(data.palette)
        setCatalogItems(data.catalog || [])

        setCurrentStep(2)
        setTimeout(() => navigate('/profile'), 1200)
      } catch (err) {
        console.error('[Analyzing] error:', err)
        if (err instanceof AllowanceError) {
          setAllowanceError({ message: err.message, reason: err.reason })
        } else {
          setError(err.message || 'Analysis failed.')
        }
      }
    }

    run()
  }, [capturedFile, location.state, navigate, profile, setProfile, setPalette, setCatalogItems])

  if (allowanceError) {
    return <AllowanceExhausted message={allowanceError.message} reason={allowanceError.reason} />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ErrorCard
            title="Analysis failed"
            message={error}
            onRetry={() => navigate('/capture')}
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Animated background shimmer */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(113,135,120,0.05) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Color wave circles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/5"
            initial={{ width: 100, height: 100, opacity: 0 }}
            animate={{
              width: [100, 500],
              height: [100, 500],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 1,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center"
      >
        {/* Sparkle icon */}
        <motion.div
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-accent/5 flex items-center justify-center"
        >
          <Sparkles size={28} className="text-accent" strokeWidth={1.5} />
        </motion.div>

        <h2 className="text-2xl sm:text-3xl font-semibold text-ink mb-12">
          Analyzing your colours
        </h2>

        {/* Enhanced stepper */}
        <div className="flex flex-col gap-0 w-full max-w-xs mx-auto mb-12">
          {STEPS.map((step, i) => {
            const isComplete = i < currentStep
            const isCurrent = i === currentStep

            return (
              <div key={i}>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {/* Glow effect for current step */}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-accent/20"
                        animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    <motion.div
                      className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isComplete
                          ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20'
                          : isCurrent
                            ? 'border-accent text-accent bg-white shadow-md'
                            : 'border-border/60 text-ink-light/40 bg-white'
                      }`}
                      animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                      transition={isCurrent ? { duration: 1.5, repeat: Infinity } : {}}
                    >
                      {isComplete ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
                          <Check size={18} strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <span className="text-sm font-semibold">{i + 1}</span>
                      )}
                    </motion.div>
                  </div>
                  <span
                    className={`text-sm transition-all duration-300 ${
                      isComplete ? 'text-ink font-medium' : isCurrent ? 'text-ink font-medium' : 'text-ink-light/40'
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div className="ml-5 h-6 flex items-center">
                    <div className="w-px h-full bg-border/40 relative overflow-hidden">
                      <motion.div
                        className="absolute top-0 w-full bg-accent"
                        initial={{ height: '0%' }}
                        animate={{ height: isComplete ? '100%' : '0%' }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Fun fact */}
        <AnimatePresence mode="wait">
          <motion.div
            key={factIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="max-w-sm mx-auto"
          >
            <p className="text-xs font-semibold text-accent/60 uppercase tracking-wider mb-1.5">Did you know?</p>
            <p className="text-sm text-ink-light leading-relaxed">{FUN_FACTS[factIndex]}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
