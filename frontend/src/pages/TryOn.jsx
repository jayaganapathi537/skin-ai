import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ArrowRight, ChevronLeft, Sparkles, Loader2, Camera } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { startTryOn, AllowanceError } from '../api/client'
import BeforeAfterSlider from '../components/BeforeAfterSlider'
import ErrorCard from '../components/ErrorCard'
import AllowanceExhausted from '../components/AllowanceExhausted'

export default function TryOn() {
  const navigate = useNavigate()
  const { selectedGarment, capturedImage, capturedFile, tryonResult, setTryonResult } = useApp()
  const [photoPreview, setPhotoPreview] = useState(capturedImage)
  const [photoFile, setPhotoFile] = useState(capturedFile)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allowanceError, setAllowanceError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!selectedGarment) navigate('/shop')
  }, [selectedGarment, navigate])

  if (!selectedGarment) return null

  if (allowanceError) {
    return <AllowanceExhausted message={allowanceError.message} reason={allowanceError.reason} />
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
    setTryonResult(null)
    setError(null)
  }

  const handleTryOn = async () => {
    if (!photoFile) return
    setLoading(true)
    setError(null)
    try {
      const garmentSrc = selectedGarment.tryon_image || selectedGarment.external_url
      if (!garmentSrc) {
        throw new Error('Garment image not available for try-on')
      }
      const result = await startTryOn(photoFile, garmentSrc)
      setTryonResult(result)
    } catch (err) {
      if (err instanceof AllowanceError) {
        setAllowanceError({ message: err.message, reason: err.reason })
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4 sm:px-6 lg:px-8 py-8 max-w-[720px] mx-auto"
      >

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-semibold text-ink mb-6"
        >
          Virtual Try-On
        </motion.h1>

        {/* Selected garment */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-xl border border-border p-4 mb-8 flex items-center gap-4 shadow-sm"
        >
          <div
            className="w-16 h-20 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: selectedGarment.dominant_hex + '15' }}
          >
            <div
              className="w-10 h-14 rounded-md shadow-sm"
              style={{
                backgroundColor: selectedGarment.dominant_hex,
              }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{selectedGarment.name}</h3>
            <p className="text-xs text-ink-light">{selectedGarment.category}</p>
            <p className="text-xs text-ink mt-0.5">{selectedGarment.price} <span className="text-[10px]">Demo price</span></p>
            {selectedGarment.match_score >= 75 && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-success">
                <Sparkles size={10} /> Great match
              </span>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!tryonResult && !loading && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">Full-Body Photo</p>

              <div className="mb-4 p-4 bg-accent/5 rounded-xl border border-accent/10">
                <p className="text-xs text-ink leading-relaxed">
                  <strong className="text-ink">Important:</strong> Use a clear full-body photo for best results.
                  Your face selfie won't work for clothing try-on.
                </p>
              </div>

              {photoPreview ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative mb-6"
                >
                  <div className="rounded-2xl overflow-hidden shadow-md border border-border">
                    <img src={photoPreview} alt="Your photo" className="w-full aspect-[3/4] object-cover" />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 px-3 py-2 text-xs font-medium text-white bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/70 transition-colors"
                  >
                    Change Photo
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-80 rounded-2xl border-2 border-dashed border-border bg-muted hover:bg-surface flex flex-col items-center justify-center gap-4 transition-all mb-4"
                >
                  {/* Body outline guide */}
                  <svg
                    className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
                    viewBox="0 0 200 320"
                    fill="none"
                  >
                    <ellipse cx="100" cy="40" rx="25" ry="30" stroke="currentColor" strokeWidth="2" className="text-accent" />
                    <line x1="100" y1="70" x2="100" y2="140" stroke="currentColor" strokeWidth="2" className="text-accent" />
                    <line x1="100" y1="90" x2="60" y2="120" stroke="currentColor" strokeWidth="2" className="text-accent" />
                    <line x1="100" y1="90" x2="140" y2="120" stroke="currentColor" strokeWidth="2" className="text-accent" />
                    <line x1="100" y1="140" x2="70" y2="230" stroke="currentColor" strokeWidth="2" className="text-accent" />
                    <line x1="100" y1="140" x2="130" y2="230" stroke="currentColor" strokeWidth="2" className="text-accent" />
                  </svg>

                  <div className="relative z-10 w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Camera size={24} className="text-accent" strokeWidth={1.5} />
                  </div>
                  <div className="relative z-10 text-center px-6">
                    <span className="text-sm font-medium text-ink block mb-1">Upload Full-Body Photo</span>
                    <span className="text-xs text-ink-light">Stand straight, show full outfit area</span>
                  </div>
                </motion.button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <ErrorCard title="Try-on failed" message={error} onRetry={handleTryOn} />
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTryOn}
                disabled={!photoFile}
                className="w-full py-4 text-base font-medium text-white bg-accent hover:bg-accent-dark rounded-xl shadow-sm min-h-[52px] disabled:opacity-40 transition-all"
              >
                Try It On
              </motion.button>
            </motion.div>
          )}

          {/* Loading state */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-14 h-14 rounded-xl bg-accent/8 flex items-center justify-center mb-6"
              >
                <Loader2 size={24} className="text-accent" />
              </motion.div>
              <p className="text-lg font-semibold text-ink mb-2">Processing Try-On</p>
              <p className="text-sm text-ink-light">This may take 20-30 seconds</p>
              <motion.div
                className="w-48 h-1.5 bg-border rounded-full overflow-hidden mt-6"
              >
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 30, ease: 'easeOut' }}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Result */}
          {tryonResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
                <BeforeAfterSlider
                  beforeSrc={photoPreview}
                  afterSrc={tryonResult.result_url}
                />
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/shop')}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-ink bg-surface border border-border hover:border-accent/30 rounded-xl hover:shadow-sm transition-all"
                >
                  Try Another
                  <ArrowRight size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/share')}
                  className="flex-1 py-3.5 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl transition-all"
                >
                  Share Results
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
