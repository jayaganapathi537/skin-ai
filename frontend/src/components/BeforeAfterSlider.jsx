import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

export default function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel = 'Before', afterLabel = 'After' }) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  const handlePointerDown = useCallback((e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  if (!beforeSrc && !afterSrc) {
    return (
      <div className="w-full aspect-[3/4] rounded-2xl bg-border/30 flex items-center justify-center">
        <p className="text-sm text-ink-lighter">No images to compare</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      ref={containerRef}
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden cursor-col-resize select-none bg-canvas-alt border border-border shadow-lg"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image (full) */}
      {afterSrc && (
        <img src={afterSrc} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Before image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        {beforeSrc && (
          <img
            src={beforeSrc}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ minWidth: containerRef.current?.offsetWidth || '100%' }}
          />
        )}
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.3)]"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-accent/30">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M5 3L2 8L5 13" stroke="#C4856B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 3L14 8L11 13" stroke="#C4856B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="glass absolute bottom-3 left-3 text-[11px] font-semibold text-ink tracking-wide uppercase px-2.5 py-1 rounded-full border border-white/30 shadow-sm">
        {beforeLabel}
      </span>
      <span className="glass absolute bottom-3 right-3 text-[11px] font-semibold text-ink tracking-wide uppercase px-2.5 py-1 rounded-full border border-white/30 shadow-sm">
        {afterLabel}
      </span>
    </motion.div>
  )
}
