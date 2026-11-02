import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

const ICONS = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
}

const COLORS = {
  error: { bg: 'bg-error-bg/90', border: 'border-error/20', text: 'text-error', bar: 'bg-error' },
  success: { bg: 'bg-success-bg/90', border: 'border-success/20', text: 'text-success', bar: 'bg-success' },
  info: { bg: 'bg-accent-bg/90', border: 'border-accent/20', text: 'text-accent', bar: 'bg-accent' },
}

export default function Toast({ message, type = 'info', onClose, visible, duration = 4000 }) {
  const Icon = ICONS[type] || ICONS.info
  const color = COLORS[type] || COLORS.info
  const [show, setShow] = useState(visible)

  useEffect(() => {
    setShow(visible)
    if (visible && duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 glass border ${color.border} rounded-2xl shadow-xl overflow-hidden min-w-[280px] max-w-[90vw]`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl ${color.bg} flex items-center justify-center`}>
              <Icon size={16} className={color.text} />
            </div>
            <span className="text-sm font-medium text-ink flex-1">{message}</span>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-border/50 text-ink-lighter hover:text-ink transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {duration > 0 && (
            <div className="h-[2px] bg-border/30">
              <motion.div
                className={`h-full ${color.bar} origin-left`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
