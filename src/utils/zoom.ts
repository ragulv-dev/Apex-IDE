// Zoom Management Utility for APEX IDE
// Handles Electron webFrame zoom, browser fallback, keyboard shortcuts, and visual badge feedback.

type ZoomListener = (percentage: number) => void

const listeners = new Set<ZoomListener>()
let currentFactor = 1.0

// Load saved zoom factor
try {
  const saved = localStorage.getItem('apex:zoomFactor')
  if (saved) {
    const parsed = parseFloat(saved)
    if (!isNaN(parsed) && parsed >= 0.4 && parsed <= 3.0) {
      currentFactor = parsed
    }
  }
} catch {}

function notify() {
  const pct = Math.round(currentFactor * 100)
  listeners.forEach(fn => fn(pct))
}

export function subscribeZoom(fn: ZoomListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getZoomFactor(): number {
  if (typeof window !== 'undefined' && window.electron?.window?.getZoomFactor) {
    try {
      return window.electron.window.getZoomFactor()
    } catch {}
  }
  return currentFactor
}

export function getZoomPercentage(): number {
  return Math.round(getZoomFactor() * 100)
}

export function setZoomFactor(factor: number): number {
  const clamped = Math.max(0.4, Math.min(3.0, Math.round(factor * 10) / 10))
  currentFactor = clamped
  try {
    localStorage.setItem('apex:zoomFactor', String(clamped))
  } catch {}

  if (typeof window !== 'undefined') {
    if (window.electron?.window?.setZoomFactor) {
      try {
        window.electron.window.setZoomFactor(clamped)
      } catch {}
    } else {
      // Browser fallback
      ;(document.body.style as any).zoom = `${clamped}`
    }
  }

  notify()
  return clamped
}

export function zoomIn(): number {
  const current = getZoomFactor()
  const next = Math.min(Math.round((current + 0.1) * 10) / 10, 3.0)
  return setZoomFactor(next)
}

export function zoomOut(): number {
  const current = getZoomFactor()
  const next = Math.max(Math.round((current - 0.1) * 10) / 10, 0.4)
  return setZoomFactor(next)
}

export function resetZoom(): number {
  return setZoomFactor(1.0)
}

// Initialize zoom on load
export function initZoom() {
  if (typeof window === 'undefined') return
  if (currentFactor !== 1.0) {
    setZoomFactor(currentFactor)
  }
}
