import { useEffect, useRef } from 'react'

const CLR = [15, 15, 15]

function buildFacePoints() {
  const pts = []
  const arc = (cx, cy, rx, ry, a0, a1, n) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n)
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
    }
  }

  // jawline
  arc(0.5, 0.5, 0.29, 0.36, -0.1, Math.PI + 0.1, 18)
  // hairline
  arc(0.5, 0.34, 0.27, 0.17, Math.PI, Math.PI * 2, 12)
  // left eye
  arc(0.385, 0.42, 0.055, 0.022, 0, Math.PI * 2, 8)
  // right eye
  arc(0.615, 0.42, 0.055, 0.022, 0, Math.PI * 2, 8)
  // left brow
  arc(0.385, 0.375, 0.075, 0.014, Math.PI * 0.85, Math.PI * 2.15, 5)
  // right brow
  arc(0.615, 0.375, 0.075, 0.014, Math.PI * 0.85, Math.PI * 2.15, 5)
  // nose bridge
  for (let i = 0; i < 5; i++) pts.push([0.5, 0.4 + i * 0.028])
  // nose wings
  pts.push([0.47, 0.535], [0.5, 0.545], [0.53, 0.535])
  // upper lip
  arc(0.5, 0.595, 0.065, 0.012, Math.PI, Math.PI * 2, 6)
  // lower lip
  arc(0.5, 0.615, 0.055, 0.02, 0, Math.PI, 5)
  // inner mesh
  pts.push(
    [0.33, 0.48], [0.67, 0.48],
    [0.35, 0.55], [0.65, 0.55],
    [0.42, 0.32], [0.58, 0.32],
    [0.5, 0.295], [0.5, 0.345],
    [0.29, 0.39], [0.71, 0.39],
    [0.5, 0.72], [0.46, 0.695], [0.54, 0.695],
    [0.44, 0.475], [0.56, 0.475],
    [0.5, 0.565],
    [0.38, 0.62], [0.62, 0.62],
    [0.42, 0.67], [0.58, 0.67],
    [0.5, 0.25],
    [0.38, 0.28], [0.62, 0.28],
    [0.3, 0.45], [0.7, 0.45],
    [0.34, 0.35], [0.66, 0.35],
    [0.5, 0.50],
  )
  return pts
}

function buildEdges(pts, maxD) {
  const edges = []
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i][0] - pts[j][0]
      const dy = pts[i][1] - pts[j][1]
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < maxD) edges.push([i, j, d])
    }
  }
  return edges
}

export default function InteractiveFace() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: 0.5, y: 0.5, active: false })
  const state = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const facePoints = buildFacePoints()
    const edges = buildEdges(facePoints, 0.09)

    const nodes = facePoints.map(([tx, ty]) => ({
      tx, ty,
      x: 0.2 + Math.random() * 0.6,
      y: 0.1 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
      pulse: Math.random() * Math.PI * 2,
      size: 1.2 + Math.random() * 1.8,
    }))

    const signals = edges
      .filter(() => Math.random() < 0.15)
      .map(([a, b]) => ({
        a, b,
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.006,
        dir: Math.random() > 0.5 ? 1 : -1,
      }))

    state.current = { nodes, edges, signals, progress: 0 }

    let raf
    const t0 = performance.now()
    const assembleMs = 2200

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(now) {
      raf = requestAnimationFrame(draw)
      const { nodes, edges, signals } = state.current

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const elapsed = now - t0
      const progress = Math.min(elapsed / assembleMs, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      state.current.progress = ease

      const mx = mouse.current.x
      const my = mouse.current.y
      const mActive = mouse.current.active

      for (const n of nodes) {
        const baseX = n.tx * ease + (n.x * (1 - ease) + n.vx * Math.sin(now * 0.001))
        const baseY = n.ty * ease + (n.y * (1 - ease) + n.vy * Math.cos(now * 0.0012))

        let fx = baseX, fy = baseY
        if (mActive) {
          const ddx = baseX - mx
          const ddy = baseY - my
          const dist = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dist < 0.15 && dist > 0.001) {
            const push = (0.15 - dist) * 0.12
            fx += (ddx / dist) * push
            fy += (ddy / dist) * push
          }
        }

        n.cx = fx
        n.cy = fy
        n.pulse += 0.03
      }

      // edges
      for (const [a, b, d] of edges) {
        const na = nodes[a], nb = nodes[b]
        const alpha = (1 - d / 0.09) * 0.35 * (0.3 + ease * 0.7)
        ctx.beginPath()
        ctx.moveTo(na.cx * w, na.cy * h)
        ctx.lineTo(nb.cx * w, nb.cy * h)
        ctx.strokeStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${alpha})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      // signals traveling along edges
      for (const s of signals) {
        s.t += s.speed * s.dir
        if (s.t > 1) { s.t = 0 }
        if (s.t < 0) { s.t = 1 }
        const na = nodes[s.a], nb = nodes[s.b]
        const sx = na.cx + (nb.cx - na.cx) * s.t
        const sy = na.cy + (nb.cy - na.cy) * s.t
        ctx.beginPath()
        ctx.arc(sx * w, sy * h, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},0.8)`
        ctx.fill()
      }

      // nodes
      for (const n of nodes) {
        const glow = 0.5 + 0.5 * Math.sin(n.pulse)
        const r = n.size * (0.7 + ease * 0.3)
        ctx.beginPath()
        ctx.arc(n.cx * w, n.cy * h, r + 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${0.08 * glow})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.cx * w, n.cy * h, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${0.5 + 0.4 * glow})`
        ctx.fill()
      }

      // corner brackets (HUD)
      if (ease > 0.3) {
        const hudAlpha = Math.min((ease - 0.3) / 0.4, 1) * 0.6
        ctx.strokeStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${hudAlpha})`
        ctx.lineWidth = 2
        const m = 20, c = 30
        // top-left
        ctx.beginPath(); ctx.moveTo(m, m + c); ctx.lineTo(m, m); ctx.lineTo(m + c, m); ctx.stroke()
        // top-right
        ctx.beginPath(); ctx.moveTo(w - m - c, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + c); ctx.stroke()
        // bottom-left
        ctx.beginPath(); ctx.moveTo(m, h - m - c); ctx.lineTo(m, h - m); ctx.lineTo(m + c, h - m); ctx.stroke()
        // bottom-right
        ctx.beginPath(); ctx.moveTo(w - m - c, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - c); ctx.stroke()
      }

      // scanning line
      if (ease > 0.5) {
        const scanAlpha = Math.min((ease - 0.5) / 0.3, 1) * 0.3
        const scanY = ((now * 0.0003) % 1) * h
        const grad = ctx.createLinearGradient(0, scanY - 1, 0, scanY + 1)
        grad.addColorStop(0, `rgba(${CLR[0]},${CLR[1]},${CLR[2]},0)`)
        grad.addColorStop(0.5, `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${scanAlpha})`)
        grad.addColorStop(1, `rgba(${CLR[0]},${CLR[1]},${CLR[2]},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(30, scanY - 15, w - 60, 30)
      }

      // small HUD readouts
      if (ease > 0.6) {
        const rAlpha = Math.min((ease - 0.6) / 0.3, 1) * 0.4
        ctx.fillStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${rAlpha})`
        ctx.fillRect(28, 55, 35, 3)
        ctx.fillRect(28, 62, 22, 2)
        ctx.fillRect(28, 68, 28, 2)
        // top-right circle indicator
        ctx.beginPath()
        ctx.arc(w - 38, 50, 5, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${CLR[0]},${CLR[1]},${CLR[2]},${rAlpha})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(w - 38, 50, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(draw)

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      mouse.current.x = (e.clientX - r.left) / r.width
      mouse.current.y = (e.clientY - r.top) / r.height
      mouse.current.active = true
    }
    const onLeave = () => { mouse.current.active = false }

    window.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[4/5]">
      <div className="absolute inset-0 rounded-3xl bg-black/[0.03] blur-3xl scale-110" />
      <canvas
        ref={canvasRef}
        className="relative w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}
