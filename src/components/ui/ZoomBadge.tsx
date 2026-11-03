import { useEffect, useState, useRef } from 'react'
import { subscribeZoom, getZoomPercentage } from '../../utils/zoom'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export function ZoomBadge() {
  const [zoomPct, setZoomPct] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<any>(null)
  const prevPctRef = useRef<number>(100)

  useEffect(() => {
    const unsub = subscribeZoom((pct) => {
      setZoomPct(pct)
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setVisible(false)
      }, 1200)
      prevPctRef.current = pct
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!visible || zoomPct === null) return null

  const isReset = zoomPct === 100
  const isZoomIn = zoomPct > prevPctRef.current

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 36,
        right: 20,
        zIndex: 10000,
        background: '#0d1117',
        border: '1px solid rgba(0, 102, 255, 0.4)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 16px rgba(0, 102, 255, 0.25)',
        borderRadius: 8,
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.04em',
        pointerEvents: 'none',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      {isReset ? (
        <RotateCcw size={14} style={{ color: '#00D9FF' }} />
      ) : isZoomIn ? (
        <ZoomIn size={14} style={{ color: '#0066FF' }} />
      ) : (
        <ZoomOut size={14} style={{ color: '#A1A1AA' }} />
      )}
      <span>Zoom: {zoomPct}%</span>
    </div>
  )
}

