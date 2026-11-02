import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

export default function ErrorCard({ title = 'Something went wrong', message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="w-full max-w-sm mx-auto bg-surface rounded-2xl border border-border p-8 text-center space-y-5 shadow-sm"
    >
      <div className="w-14 h-14 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" stroke="#718778" />
          <path d="M8 15s1.5-2 4-2 4 2 4 2" stroke="#718778" />
          <circle cx="9" cy="9.5" r="0.5" fill="#718778" stroke="#718778" />
          <circle cx="15" cy="9.5" r="0.5" fill="#718778" stroke="#718778" />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        {message && (
          <p className="text-sm text-ink leading-relaxed">{message}</p>
        )}
      </div>

      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl transition-all min-h-[44px]"
        >
          <RefreshCw size={16} />
          Try Again
        </motion.button>
      )}
    </motion.div>
  )
}
