import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Palette, Shirt, Sparkles, Shield, Zap, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getDemo } from '../api/client'
import { useState } from 'react'
import InteractiveFace from '../components/InteractiveFace'

const journey = [
  { icon: Camera, label: 'Analyse', desc: 'Capture your selfie' },
  { icon: Palette, label: 'Discover', desc: 'Your colour palette' },
  { icon: Shirt, label: 'Explore', desc: 'Matched clothing' },
  { icon: Sparkles, label: 'Try On', desc: 'Virtual preview' },
]

const features = [
  { icon: Sparkles, title: 'AI-Powered Analysis', desc: 'Advanced colour detection identifies your unique skin, eye, and lip tones from your photo' },
  { icon: Shield, title: 'Privacy First', desc: 'Your photo is used only to create your result. Not stored or shared' },
  { icon: Zap, title: 'Instant Results', desc: 'Get your personalised colour palette and clothing recommendations in a moment' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] } }),
}

export default function Landing() {
  const navigate = useNavigate()
  const { setProfile, setPalette, setCatalogItems, setIsDemo } = useApp()
  const [loading, setLoading] = useState(false)

  const handleDemo = async () => {
    setLoading(true)
    try {
      const data = await getDemo('light')
      setProfile(data.analysis.profile)
      setPalette(data.analysis.palette)
      setCatalogItems(data.catalog || [])
      setIsDemo(true)
      navigate('/profile')
    } catch {
      setIsDemo(true)
      setProfile({
        skin_color: '#E8B89D',
        eye_color: '#6B4E3D',
        eye_color_name: 'Brown',
        lip_color: '#C47A7A',
        eyebrow_color: '#5C4033',
        hair_color: '#3B2F2F',
        hair_color_name: 'Brown',
        undertone: 'Warm',
        depth: 'Light',
        contrast: 'Medium',
        confidence: 0.82,
        summary: 'You have a warm, light complexion with medium contrast between your skin and hair.',
      })
      setPalette({
        family: 'warm_light',
        hero_colors: [
          { hex: '#E07B54', name: 'Terracotta', reason: 'Echoes your warm undertone' },
          { hex: '#D4A04A', name: 'Honey Gold', reason: 'Complements golden skin base' },
          { hex: '#8B6F4E', name: 'Warm Camel', reason: 'Tonal match with your colouring' },
          { hex: '#C75B39', name: 'Burnt Sienna', reason: 'Rich warmth near the face' },
          { hex: '#A0522D', name: 'Sienna', reason: 'Deepens your natural warmth' },
          { hex: '#6B8E5A', name: 'Olive Green', reason: 'Earth tone that flatters warm skin' },
          { hex: '#B8704D', name: 'Copper', reason: 'Mirrors your warm chroma' },
          { hex: '#D98C6A', name: 'Apricot', reason: 'Soft warmth close to skin tone' },
          { hex: '#8B4513', name: 'Saddle Brown', reason: 'Grounding deep warm tone' },
          { hex: '#CD853F', name: 'Peru', reason: 'Classic warm neutral' },
        ],
        neutral_colors: [
          { hex: '#F5F0EB', name: 'Warm White' },
          { hex: '#D2C8BE', name: 'Warm Taupe' },
          { hex: '#8B7D72', name: 'Warm Grey' },
          { hex: '#3B3230', name: 'Espresso' },
        ],
        care_colors: [
          { hex: '#FF69B4', name: 'Hot Pink', reason: 'Cool-toned pink may clash with warm undertone' },
          { hex: '#4169E1', name: 'Royal Blue', reason: 'Cool blue can wash out warm skin' },
          { hex: '#C0C0C0', name: 'Silver', reason: 'Cool metallic less flattering than gold' },
          { hex: '#E6E6FA', name: 'Lavender', reason: 'Cool pastel may dull warm colouring' },
        ],
      })
      navigate('/profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/8 border border-accent/15">
                <Sparkles size={12} className="text-accent" />
                <span className="text-xs font-medium text-accent">AI Colour Analysis</span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-4xl sm:text-5xl md:text-6xl font-semibold text-ink leading-tight"
              >
                Find colours that
                <br />
                <span className="text-accent">suit you</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-lg text-ink-light leading-relaxed max-w-md"
              >
                Discover your personal colour palette with AI-powered skin analysis. Match clothing to your unique tones and try them on virtually.
              </motion.p>

              <motion.div
                variants={fadeUp}
                custom={3}
                className="flex flex-col sm:flex-row gap-3 pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/capture')}
                  className="group px-6 py-3.5 text-base font-medium text-white bg-accent hover:bg-accent-dark rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Start Analysis
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDemo}
                  disabled={loading}
                  className="px-6 py-3.5 text-base font-medium text-ink bg-surface border border-border hover:border-accent/30 rounded-xl hover:shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Try Sample'}
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Right: Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex justify-center"
            >
              <InteractiveFace />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-12 bg-muted">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} custom={0} className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-semibold text-ink">
              Your Journey
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {journey.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="relative bg-surface rounded-xl border border-border p-6 text-center hover:border-accent/30 hover:shadow-sm transition-all"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent/8 flex items-center justify-center">
                  <step.icon size={20} className="text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-1">{step.label}</h3>
                <p className="text-xs text-ink-light leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-3 gap-8"
          >
            {features.map((feat, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="text-center space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-accent/8 flex items-center justify-center">
                  <feat.icon size={20} className="text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-ink">{feat.title}</h3>
                <p className="text-sm text-ink-light leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-8 py-8 text-center border-t border-border">
        <p className="text-xs text-ink">
          Skin AI — Powered by YouCam API · Personal colour analysis for everyone
        </p>
      </footer>
    </div>
  )
}
