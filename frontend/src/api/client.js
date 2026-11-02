const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class AllowanceError extends Error {
  constructor(message, reason) {
    super(message)
    this.name = 'AllowanceError'
    this.reason = reason
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 429) {
      const detail = typeof body.detail === 'object' ? body.detail : {}
      throw new AllowanceError(
        detail.message || 'Daily limit reached. Try our sample mode instead!',
        detail.reason || 'personal',
      )
    }
    const msg = typeof body.detail === 'string' ? body.detail : body.detail?.message || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

export { AllowanceError }

export function analyzeImage(file) {
  const form = new FormData()
  form.append('image', file)
  return request('/api/analyze', { method: 'POST', body: form })
}

export function getCatalog(paletteFamily) {
  const params = paletteFamily ? `?palette_family=${encodeURIComponent(paletteFamily)}` : ''
  return request(`/api/catalog${params}`)
}

export function startTryOn(file, garmentImageUrl) {
  const form = new FormData()
  form.append('user_photo', file)
  form.append('garment_image_url', garmentImageUrl)
  return request('/api/tryon', { method: 'POST', body: form }).then((data) => {
    if (data.result_url && data.result_url.startsWith('/')) {
      data.result_url = `${API_BASE}${data.result_url}`
    }
    return data
  })
}

export function getDemo(persona) {
  return request(`/api/demo/${encodeURIComponent(persona)}`)
}

export function getHealth() {
  return request('/api/health')
}
