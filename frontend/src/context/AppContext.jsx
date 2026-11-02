import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [palette, setPalette] = useState(null)
  const [catalogItems, setCatalogItems] = useState([])
  const [selectedGarment, setSelectedGarment] = useState(null)
  const [tryonResult, setTryonResult] = useState(null)
  const [isDemo, setIsDemo] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [capturedFile, setCapturedFile] = useState(null)

  const reset = useCallback(() => {
    setProfile(null)
    setPalette(null)
    setCatalogItems([])
    setSelectedGarment(null)
    setTryonResult(null)
    setIsDemo(false)
    setCapturedImage(null)
    setCapturedFile(null)
  }, [])

  return (
    <AppContext.Provider
      value={{
        profile, setProfile,
        palette, setPalette,
        catalogItems, setCatalogItems,
        selectedGarment, setSelectedGarment,
        tryonResult, setTryonResult,
        isDemo, setIsDemo,
        capturedImage, setCapturedImage,
        capturedFile, setCapturedFile,
        reset,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
