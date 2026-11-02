import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, SlidersHorizontal, ShoppingBag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getCatalog } from '../api/client'
import GarmentCard from '../components/GarmentCard'

const CATEGORIES = ['All', 'Tops', 'Dresses', 'Jackets', 'Bottoms']
const MATCH_FILTERS = ['All matches', 'Great matches', 'Good matches']

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
}

export default function Shop() {
  const navigate = useNavigate()
  const { catalogItems, setCatalogItems, setSelectedGarment, setTryonResult, palette, profile } = useApp()
  const [category, setCategory] = useState('All')
  const [matchFilter, setMatchFilter] = useState('All matches')

  useEffect(() => {
    if (catalogItems.length === 0 && palette?.family) {
      getCatalog(palette.family).then((data) => {
        if (data.garments?.length) setCatalogItems(data.garments)
      }).catch(() => {})
    }
  }, [catalogItems.length, palette, setCatalogItems])

  if (!palette) {
    navigate('/')
    return null
  }

  const items = catalogItems.length > 0 ? catalogItems : generatePlaceholderCatalog(palette)

  const filtered = useMemo(() => {
    let result = [...items]
    if (category !== 'All') {
      result = result.filter((g) => g.category === category)
    }
    if (matchFilter === 'Great matches') {
      result = result.filter((g) => g.match_score >= 75)
    } else if (matchFilter === 'Good matches') {
      result = result.filter((g) => g.match_score >= 50)
    }
    // 'All matches' shows everything
    return result.sort((a, b) => b.match_score - a.match_score)
  }, [items, category, matchFilter])

  const handleTryOn = (garment) => {
    setSelectedGarment(garment)
    setTryonResult(null)
    navigate('/tryon')
  }

  return (
    <div className="min-h-screen bg-canvas">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1040px] mx-auto"
      >

        <motion.div initial="hidden" animate="visible">
          <motion.h1 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-semibold text-ink mb-2">
            Shop Your Palette
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} className="text-sm text-ink-light mb-1 leading-relaxed">
            Garments ranked by how well they match your colours.
          </motion.p>
          <motion.p variants={fadeUp} custom={1} className="text-xs text-ink mb-2">
            Sample catalogue. Prices are illustrative and nothing can be purchased.
          </motion.p>
        </motion.div>

        {/* Palette banner */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 px-4 py-3 bg-accent/5 rounded-xl border border-accent/10 mb-6"
          >
            <div className="flex -space-x-1">
              {palette.hero_colors?.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <span className="text-xs text-ink-light">
              Matched for your <span className="font-medium text-ink">{profile.undertone?.toLowerCase()} {profile.depth?.toLowerCase()}</span> palette
            </span>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8 space-y-4"
        >
          {/* Category filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider">Category</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
              <motion.button
                key={c}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                  category === c
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-surface text-ink-light border-border hover:border-accent/30 hover:shadow-sm'
                }`}
              >
                {c}
              </motion.button>
            ))}
          </div>
          </div>

          {/* Match filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-ink uppercase tracking-wider">Match</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MATCH_FILTERS.map((m) => (
                <motion.button
                  key={m}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setMatchFilter(m)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-200 ${
                    matchFilter === m
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface text-ink-light border-border hover:border-accent/30 hover:shadow-sm'
                  }`}
                >
                  {m}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-border/30 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={24} className="text-ink-light/40" />
              </div>
              <p className="text-ink-light font-medium mb-2">No garments match these filters</p>
              <button
                onClick={() => { setCategory('All'); setMatchFilter('All matches') }}
                className="text-sm text-accent hover:underline underline-offset-2"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6"
            >
              {filtered.map((garment, i) => (
                <motion.div
                  key={garment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(i, 8), duration: 0.4 }}
                >
                  <GarmentCard garment={garment} onTryOn={handleTryOn} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-[11px] text-ink-light/40 text-center"
        >
          This is a demo catalogue. Prices shown are for illustration only.
        </motion.p>
      </motion.div>
    </div>
  )
}

function generatePlaceholderCatalog(palette) {
  const garments = []
  const categories = ['Tops', 'Dresses', 'Jackets', 'Bottoms']
  const names = [
    'Classic Tee', 'Linen Blouse', 'Silk Cami', 'Crew Knit',
    'Wrap Dress', 'Midi Dress', 'Shift Dress', 'A-Line Dress',
    'Blazer', 'Denim Jacket', 'Wool Coat', 'Cardigan',
    'Wide Leg Trouser', 'Pencil Skirt', 'Pleated Pant', 'Culottes',
    'Ribbed Tank', 'Oxford Shirt', 'Tunic Top', 'Peplum Blouse',
    'Maxi Dress', 'Sheath Dress', 'Trench Coat', 'Slim Chino',
  ]

  const allColors = [
    ...(palette.hero_colors || []).map((c) => ({ ...c, score: 85 + Math.random() * 15 })),
    ...(palette.neutral_colors || []).map((c) => ({ ...c, score: 60 + Math.random() * 20 })),
    ...(palette.care_colors || []).map((c) => ({ ...c, score: 20 + Math.random() * 25 })),
  ]

  for (let i = 0; i < 24; i++) {
    const color = allColors[i % allColors.length]
    garments.push({
      id: `g${i + 1}`,
      name: names[i] || `Garment ${i + 1}`,
      category: categories[Math.floor(i / 6) % categories.length],
      dominant_hex: color.hex,
      price: `$${(39 + Math.floor(Math.random() * 80)).toFixed(0)}`,
      match_score: Math.round(color.score),
    })
  }

  return garments
}
