import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function Stepper({ steps, currentStep }) {
  return (
    <div className="flex flex-col gap-0 w-full max-w-xs mx-auto">
      {steps.map((step, i) => {
        const isComplete = i < currentStep
        const isCurrent = i === currentStep

        return (
          <div key={i}>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
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
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <Check size={18} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <span className="text-sm font-semibold">{i + 1}</span>
                  )}
                </motion.div>
              </div>
              <span
                className={`text-sm transition-all duration-300 ${
                  isComplete
                    ? 'text-ink font-medium'
                    : isCurrent
                      ? 'text-ink font-medium'
                      : 'text-ink-light/40'
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
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
  )
}
