import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Navigation from './components/Navigation'
import Landing from './pages/Landing'
import Capture from './pages/Capture'
import Analyzing from './pages/Analyzing'
import Profile from './pages/Profile'
import Palette from './pages/Palette'
import Shop from './pages/Shop'
import TryOn from './pages/TryOn'
import Share from './pages/Share'

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-canvas">
        <Navigation />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/analyzing" element={<Analyzing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/palette" element={<Palette />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/tryon" element={<TryOn />} />
          <Route path="/share" element={<Share />} />
        </Routes>
      </div>
    </AppProvider>
  )
}
