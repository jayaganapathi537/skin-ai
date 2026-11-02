import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Camera, User, Palette, ShoppingBag, Share2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useState } from 'react'

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/capture', icon: Camera, label: 'Capture', requiresProfile: false },
  { path: '/profile', icon: User, label: 'Profile', requiresProfile: true },
  { path: '/palette', icon: Palette, label: 'Palette', requiresProfile: true },
  { path: '/shop', icon: ShoppingBag, label: 'Shop', requiresProfile: true },
  { path: '/share', icon: Share2, label: 'Share', requiresProfile: true },
]

const mobileNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/capture', icon: Camera, label: 'Scan', requiresProfile: false },
  { path: '/profile', icon: User, label: 'Profile', requiresProfile: true },
  { path: '/palette', icon: Palette, label: 'Palette', requiresProfile: true },
  { path: '/shop', icon: ShoppingBag, label: 'Shop', requiresProfile: true },
]

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, palette } = useApp()
  const [hoveredItem, setHoveredItem] = useState(null)

  // Hide nav on analyzing page
  if (location.pathname === '/analyzing') return null

  const isDisabled = (item) => {
    if (!item.requiresProfile) return false
    if (item.path === '/profile') return !profile
    if (item.path === '/palette') return !palette
    if (item.path === '/shop') return !palette
    if (item.path === '/share') return !profile || !palette
    return false
  }

  return (
    <>
      {/* Desktop/Tablet Top Nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-canvas/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-white font-semibold text-sm">SA</span>
              </div>
              <span className="font-semibold text-ink">Skin AI</span>
            </motion.button>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const disabled = isDisabled(item)
                const Icon = item.icon

                return (
                  <div key={item.path} className="relative">
                    <motion.button
                      whileHover={!disabled ? { scale: 1.02 } : {}}
                      whileTap={!disabled ? { scale: 0.98 } : {}}
                      onClick={() => !disabled && navigate(item.path)}
                      onMouseEnter={() => setHoveredItem(disabled ? item.path : null)}
                      onMouseLeave={() => setHoveredItem(null)}
                      disabled={disabled}
                      aria-disabled={disabled}
                      aria-label={disabled ? `${item.label} - Complete the analysis first` : item.label}
                      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        isActive
                          ? 'text-accent bg-accent/10'
                          : disabled
                            ? 'text-ink-lighter cursor-not-allowed opacity-40'
                            : 'text-ink-light hover:text-ink hover:bg-muted'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                      <span className="hidden lg:inline">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-accent/10 rounded-lg -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </motion.button>
                    {/* Tooltip for disabled items */}
                    {disabled && hoveredItem === item.path && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-ink text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg"
                      >
                        Complete the analysis first
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-ink rotate-45" />
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path
            const disabled = isDisabled(item)
            const Icon = item.icon

            return (
              <motion.button
                key={item.path}
                whileTap={!disabled ? { scale: 0.9 } : {}}
                onClick={() => !disabled && navigate(item.path)}
                disabled={disabled}
                aria-disabled={disabled}
                aria-label={disabled ? `${item.label} - Complete the analysis first` : item.label}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
                  isActive
                    ? 'text-accent'
                    : disabled
                      ? 'text-ink-lighter opacity-40 cursor-not-allowed'
                      : 'text-ink-light'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="text-[9px] font-medium leading-tight">{item.label}</span>
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />
    </>
  )
}
