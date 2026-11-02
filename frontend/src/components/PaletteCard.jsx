import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

export default function PaletteCard({ profile, palette, onDownload }) {
  const canvasRef = useRef(null)

  const renderCard = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !profile || !palette) return null
    const ctx = canvas.getContext('2d')
    const w = 640
    const h = 960
    canvas.width = w
    canvas.height = h

    // Background with subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, '#FDFBF7')
    bgGrad.addColorStop(0.5, '#FBF7F2')
    bgGrad.addColorStop(1, '#FDFBF7')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // Subtle accent glow at top
    const glow = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, 300)
    glow.addColorStop(0, 'rgba(196,133,107,0.06)')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, 300)

    // Border
    ctx.strokeStyle = '#E8E4DF'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(12, 12, w - 24, h - 24, 24)
    ctx.stroke()

    // Brand
    ctx.fillStyle = '#C4856B'
    ctx.font = '500 13px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '3px'
    ctx.fillText('SKIN AI', w / 2, 52)

    ctx.fillStyle = '#1A1A1A'
    ctx.font = '700 26px Fraunces, Georgia, serif'
    ctx.fillText('Your Colour Palette', w / 2, 88)

    // Divider line
    ctx.strokeStyle = '#E8E4DF'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 2 - 40, 108)
    ctx.lineTo(w / 2 + 40, 108)
    ctx.stroke()

    // Detected colors strip
    const detected = [
      { label: 'Skin', color: profile.skin_color },
      { label: 'Eyes', color: profile.eye_color },
      { label: 'Lips', color: profile.lip_color },
      { label: 'Brows', color: profile.eyebrow_color },
      { label: 'Hair', color: profile.hair_color },
    ]

    const chipSize = 52
    const gap = 22
    const totalW = detected.length * chipSize + (detected.length - 1) * gap
    let x = (w - totalW) / 2

    detected.forEach(({ label, color }) => {
      // Shadow
      ctx.fillStyle = color + '30'
      ctx.beginPath()
      ctx.roundRect(x + 2, 130 + 2, chipSize, chipSize, 14)
      ctx.fill()
      // Chip
      ctx.fillStyle = color || '#808080'
      ctx.beginPath()
      ctx.roundRect(x, 130, chipSize, chipSize, 14)
      ctx.fill()
      // Sheen
      const sheen = ctx.createLinearGradient(x, 130, x + chipSize, 130 + chipSize)
      sheen.addColorStop(0, 'rgba(255,255,255,0.15)')
      sheen.addColorStop(1, 'rgba(0,0,0,0.05)')
      ctx.fillStyle = sheen
      ctx.beginPath()
      ctx.roundRect(x, 130, chipSize, chipSize, 14)
      ctx.fill()
      // Label
      ctx.fillStyle = '#6B6560'
      ctx.font = '500 11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, x + chipSize / 2, 200)
      x += chipSize + gap
    })

    // Profile summary
    ctx.fillStyle = '#1A1A1A'
    ctx.font = '500 14px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${profile.undertone}  ·  ${profile.depth}  ·  ${profile.contrast} Contrast`, w / 2, 236)

    // Best colours section
    ctx.fillStyle = '#C4856B'
    ctx.font = '600 12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('YOUR BEST COLOURS', w / 2, 280)

    const heroes = (palette.hero_colors || []).slice(0, 10)
    const cols = 5
    const cSize = 64
    const cGap = 16
    const gridW = cols * cSize + (cols - 1) * cGap
    let sy = 300

    heroes.forEach((c, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cx = (w - gridW) / 2 + col * (cSize + cGap)
      const cy = sy + row * (cSize + 28)
      // Shadow
      ctx.fillStyle = c.hex + '25'
      ctx.beginPath()
      ctx.roundRect(cx + 1, cy + 2, cSize, cSize, 14)
      ctx.fill()
      // Chip
      ctx.fillStyle = c.hex
      ctx.beginPath()
      ctx.roundRect(cx, cy, cSize, cSize, 14)
      ctx.fill()
      // Sheen
      const s = ctx.createLinearGradient(cx, cy, cx + cSize, cy + cSize)
      s.addColorStop(0, 'rgba(255,255,255,0.12)')
      s.addColorStop(1, 'rgba(0,0,0,0.04)')
      ctx.fillStyle = s
      ctx.beginPath()
      ctx.roundRect(cx, cy, cSize, cSize, 14)
      ctx.fill()
      // Name
      ctx.fillStyle = '#6B6560'
      ctx.font = '400 10px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(c.name, cx + cSize / 2, cy + cSize + 16)
    })

    const heroRows = Math.ceil(heroes.length / cols)
    let ny = sy + heroRows * (cSize + 28) + 30

    // Neutrals section
    ctx.fillStyle = '#C4856B'
    ctx.font = '600 12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('YOUR NEUTRALS', w / 2, ny)
    ny += 22

    const neutrals = palette.neutral_colors || []
    const nSize = 52
    const nGap = 14
    const nTotalW = neutrals.length * nSize + (neutrals.length - 1) * nGap
    let nx = (w - nTotalW) / 2

    neutrals.forEach((c) => {
      ctx.fillStyle = c.hex + '25'
      ctx.beginPath()
      ctx.roundRect(nx + 1, ny + 1, nSize, nSize, 12)
      ctx.fill()
      ctx.fillStyle = c.hex
      ctx.beginPath()
      ctx.roundRect(nx, ny, nSize, nSize, 12)
      ctx.fill()
      ctx.fillStyle = '#6B6560'
      ctx.font = '400 9px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(c.name, nx + nSize / 2, ny + nSize + 14)
      nx += nSize + nGap
    })

    // Footer
    ctx.fillStyle = '#E8E4DF'
    ctx.beginPath()
    ctx.moveTo(w / 2 - 80, h - 72)
    ctx.lineTo(w / 2 + 80, h - 72)
    ctx.stroke()

    ctx.fillStyle = '#252525'
    ctx.font = '500 11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Estimated with Skin AI - a styling guide', w / 2, h - 48)

    const appUrl = import.meta.env.VITE_APP_URL || ''
    if (appUrl) {
      ctx.fillStyle = '#718778'
      ctx.font = '500 11px Inter, sans-serif'
      ctx.fillText(appUrl, w / 2, h - 30)
    }

    return canvas
  }, [profile, palette])

  const handleDownload = () => {
    const canvas = renderCard()
    if (!canvas) return
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'skin-ai-palette.png'
      a.click()
      URL.revokeObjectURL(url)
    })
    onDownload?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5"
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* Visual preview card */}
      <div className="w-full max-w-sm bg-gradient-to-b from-canvas to-canvas-alt rounded-2xl border border-border overflow-hidden shadow-lg">
        {profile && (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="text-center space-y-0.5">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Skin AI</p>
              <h3 className="font-serif text-xl font-semibold text-ink">Your Colour Palette</h3>
            </div>

            {/* Divider */}
            <div className="w-10 h-px bg-border mx-auto" />

            {/* Detected colours */}
            <div className="flex justify-center gap-3.5">
              {[
                { label: 'Skin', color: profile.skin_color },
                { label: 'Eyes', color: profile.eye_color },
                { label: 'Lips', color: profile.lip_color },
                { label: 'Brows', color: profile.eyebrow_color },
                { label: 'Hair', color: profile.hair_color },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-11 h-11 rounded-xl relative overflow-hidden"
                    style={{
                      backgroundColor: s.color,
                      boxShadow: `0 2px 8px ${s.color}30`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                  </div>
                  <span className="text-[10px] font-medium text-ink-lighter tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Profile summary */}
            <p className="text-xs text-center font-medium text-ink-light">
              {profile.undertone} · {profile.depth} · {profile.contrast} contrast
            </p>

            {palette && (
              <div className="space-y-4">
                {/* Best colours */}
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase text-center mb-2.5">Best Colours</p>
                  <div className="grid grid-cols-5 gap-1.5 justify-items-center">
                    {palette.hero_colors?.slice(0, 10).map((c, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-lg relative overflow-hidden"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: `0 1px 4px ${c.hex}30`,
                        }}
                        title={c.name}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neutrals */}
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase text-center mb-2.5">Neutrals</p>
                  <div className="flex justify-center gap-1.5">
                    {palette.neutral_colors?.map((c, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-lg relative overflow-hidden"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: `0 1px 4px ${c.hex}30`,
                        }}
                        title={c.name}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-border/50 space-y-1">
              <p className="text-[10px] text-ink text-center font-medium">Estimated with Skin AI - a styling guide</p>
              {import.meta.env.VITE_APP_URL && (
                <p className="text-[10px] text-accent text-center font-medium">{import.meta.env.VITE_APP_URL}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Download button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDownload}
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-xl transition-all min-h-[44px]"
      >
        <Download size={16} />
        Download Palette Card
      </motion.button>
    </motion.div>
  )
}
