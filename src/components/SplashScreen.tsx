import React, { useEffect, useState } from 'react'

interface SplashScreenProps {
  onFinish?: () => void
  durationMs?: number
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, durationMs = 1200 }) => {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true)
    }, durationMs - 300)

    const finishTimer = setTimeout(() => {
      setVisible(false)
      onFinish?.()
    }, durationMs)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [durationMs, onFinish])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fading ? 'none' : 'auto',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src="./brand/apex-splash.png"
          alt="APEX"
          style={{
            width: 180,
            height: 180,
            objectFit: 'contain',
            borderRadius: 20,
            marginBottom: 24,
            filter: 'drop-shadow(0 16px 48px rgba(0, 102, 255, 0.3))',
            animation: 'fadeIn 0.4s ease',
          }}
        />

        {/* Minimal progress indicator */}
        <div
          style={{
            width: 120,
            height: 2,
            background: '#18181b',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '50%',
              background: 'linear-gradient(90deg, #0066FF, #00D9FF)',
              borderRadius: 1,
              animation: 'splashBar 1s infinite linear',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashBar {
          0% { left: -50%; width: 50%; }
          50% { left: 25%; width: 60%; }
          100% { left: 100%; width: 50%; }
        }
      `}</style>
    </div>
  )
}
