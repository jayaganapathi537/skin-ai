import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Eye, Sun, User, Scissors, ChevronLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ErrorCard from '../components/ErrorCard'

const tips = [
  { icon: User, text: 'Face the camera straight on', detail: 'A front-facing shot gives the most accurate analysis' },
  { icon: Scissors, text: 'Keep hair down over shoulders', detail: 'Your hair colour is part of the analysis' },
  { icon: Sun, text: 'Use soft, even lighting', detail: 'Natural daylight works best' },
  { icon: Eye, text: 'No coloured lighting', detail: 'Coloured light can distort skin tones' },
]

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } }),
}

export default function Capture() {
  const navigate = useNavigate()
  const { setCapturedImage, setCapturedFile } = useApp()
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Please use a JPG or PNG image.')
      return false
    }
    if (f.size > MAX_SIZE) {
      setError('Image must be under 10 MB.')
      return false
    }
    return true
  }

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)
    if (!validateFile(f)) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    stopCamera()
  }

  const startCamera = async () => {
    setError(null)
    setCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      })
      streamRef.current = stream
      const waitForVideo = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        } else {
          requestAnimationFrame(waitForVideo)
        }
      }
      waitForVideo()
    } catch {
      setCameraActive(false)
      setError('Camera access denied. Please allow camera access or upload a photo instead.')
    }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      const f = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      setFile(f)
      setPreview(canvas.toDataURL('image/jpeg'))
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  const clearPreview = () => {
    setPreview(null)
    setFile(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setSubmitting(true)
    setError(null)
    setCapturedFile(file)
    setCapturedImage(preview)
    navigate('/analyzing')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen relative"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent pointer-events-none" />

      <div className="relative px-4 sm:px-6 lg:px-8 py-8 max-w-[720px] mx-auto">

        {/* Header */}
        <motion.div initial="hidden" animate="visible">
          <motion.h1 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-semibold text-ink mb-3">
            Capture your
            <br />
            <span className="text-accent">selfie</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="text-sm text-ink-light mb-8 leading-relaxed">
            Take or upload a clear front-facing photo in natural light.
          </motion.p>
        </motion.div>

        {/* Capture options */}
        <AnimatePresence mode="wait">
          {!preview && !cameraActive && (
            <motion.div
              key="options"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 mb-8"
            >
              <motion.button
                variants={fadeUp}
                custom={2}
                whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(196,133,107,0.12)' }}
                whileTap={{ scale: 0.99 }}
                onClick={startCamera}
                className="w-full flex items-center gap-4 px-6 py-5 bg-white border border-border rounded-2xl hover:border-accent/40 transition-all min-h-[64px] group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Camera size={22} className="text-accent" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-ink block">Take a Photo</span>
                  <span className="text-xs text-ink-light">Use your camera for best results</span>
                </div>
              </motion.button>
              <motion.button
                variants={fadeUp}
                custom={3}
                whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
                whileTap={{ scale: 0.99 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 px-6 py-5 bg-white border border-border rounded-2xl hover:border-accent/40 transition-all min-h-[64px] group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Upload size={22} className="text-accent" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <span className="font-medium text-ink block">Upload a Photo</span>
                  <span className="text-xs text-ink-light">JPG or PNG, under 10 MB</span>
                </div>
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>
          )}

          {/* Camera viewfinder */}
          {cameraActive && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative mb-6"
            >
              <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-square object-cover"
                />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner marks */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
                  {/* Face guide oval */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[55%] h-[70%] rounded-full border-2 border-white/20" />
                  </div>
                </div>
              </div>
              {/* Camera controls */}
              <div className="flex items-center justify-center gap-6 mt-6">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={stopCamera}
                  className="w-12 h-12 rounded-full border-2 border-border text-ink-light flex items-center justify-center hover:border-ink transition-colors"
                >
                  <X size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={capturePhoto}
                  className="relative w-[72px] h-[72px] rounded-full"
                >
                  {/* Pulsing outer ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-accent/30"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 rounded-full border-4 border-accent" />
                  <div className="absolute inset-2 rounded-full bg-accent shadow-lg" />
                </motion.button>
                <div className="w-12 h-12" /> {/* Spacer for centering */}
              </div>
            </motion.div>
          )}

          {/* Photo preview */}
          {preview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative mb-6"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <img src={preview} alt="Your photo" className="w-full aspect-square object-cover" />
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearPreview}
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-lg"
              >
                <X size={18} />
              </motion.button>
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
                <span className="text-xs text-white font-medium">Ready to analyse</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <ErrorCard title="Oops" message={error} onRetry={clearPreview} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        {!cameraActive && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="bg-surface rounded-2xl border border-border p-6 mb-8 shadow-sm"
          >
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">Tips for Best Results</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={4 + i}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <tip.icon size={14} className="text-accent" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink block">{tip.text}</span>
                    <span className="text-[11px] text-ink-light leading-snug">{tip.detail}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Analyze button */}
        <AnimatePresence>
          {preview && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(196,133,107,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={submitting}
              className="w-full py-4 text-base font-medium text-white bg-accent hover:bg-accent-dark rounded-xl shadow-sm min-h-[52px] disabled:opacity-50 transition-all"
            >
              {submitting ? 'Analysing…' : 'Analyse My Colours'}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="mt-8 text-xs text-ink text-center">
          Your photo is used only to create your result. Not stored or shared.
        </p>
      </div>
    </motion.div>
  )
}
