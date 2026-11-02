import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getDemo } from '../api/client'
import { useState } from 'react'

const personas = [
  { key: 'light', label: 'Light', skin: '#F0C8A8' },
  { key: 'medium', label: 'Medium', skin: '#C8A283' },
  { key: 'deep', label: 'Deep', skin: '#6B4226' },
]

export default function AllowanceExhausted({ message, reason }) {
  const navigate = useNavigate()
  const { setProfile, setPalette, setCatalogItems, setIsDemo } = useApp()
  const [loading, setLoading] = useState(null)

  const icon = reason === 'personal' ? Clock : Users
  const Icon = icon

  const handlePersona = async (key) => {
    setLoading(key)
    try {
      const data = await getDemo(key)
      setProfile(data.analysis.profile)
      setPalette(data.analysis.palette)
      setCatalogItems(data.catalog || [])
      setIsDemo(true)
      navigate('/profile')
    } catch {
      navigate('/')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-canvas">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md bg-surface rounded-2xl border border-border p-8 text-center shadow-sm"
      >
        <div className="w-14 h-14 mx-auto mb-6 rounded-xl bg-accent/10 flex items-center justify-center">
          <Icon size={24} className="text-accent" strokeWidth={1.5} />
        </div>

        <h3 className="text-xl font-semibold text-ink mb-2">
          Out of Allowance
        </h3>
        <p className="text-sm text-ink-light leading-relaxed mb-8">
          {message}
        </p>

        <div className="mb-8">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">
            Explore Sample Profiles
          </p>
          <div className="flex justify-center gap-3">
            {personas.map((p) => (
              <motion.button
                key={p.key}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handlePersona(p.key)}
                disabled={loading !== null}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-accent/30 hover:bg-muted transition-all min-w-[85px] disabled:opacity-50"
              >
                <div
                  className="w-11 h-11 rounded-full shadow-sm ring-2 ring-white"
                  style={{ backgroundColor: p.skin }}
                />
                <span className="text-xs font-medium text-ink">{p.label}</span>
                {loading === p.key && (
                  <span className="text-[10px] text-accent">Loading...</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/')}
          className="text-sm font-medium text-ink-light hover:text-ink transition-colors"
        >
          Back to Home
        </motion.button>
      </motion.div>
    </div>
  )
}
