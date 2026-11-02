import React, { useState, useEffect, useRef } from 'react'
import { useUIStore } from '../../stores'

interface ResizerProps {
  direction: 'x' | 'y'
}

export const Resizer: React.FC<ResizerProps> = ({ direction }) => {
  const [isDragging, setIsDragging] = useState(false)
  const { 
    sidebarWidth, setSidebarWidth, 
    chatPanelWidth, setChatPanelWidth, 
    terminalHeight, setTerminalHeight 
  } = useUIStore()

  const startPos = useRef(0)
  const startDim = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    if (direction === 'x') {
      startPos.current = e.clientX
      // Check if clicking near the left or right side of screen
      if (e.clientX < window.innerWidth / 2) {
        startDim.current = sidebarWidth
      } else {
        startDim.current = chatPanelWidth
      }
    } else {
      startPos.current = e.clientY
      startDim.current = terminalHeight
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'x') {
        if (startPos.current < window.innerWidth / 2) {
          // Left resizer (Sidebar)
          const delta = e.clientX - startPos.current
          const newWidth = Math.max(160, Math.min(500, startDim.current + delta))
          setSidebarWidth(newWidth)
        } else {
          // Right resizer (Chat Panel)
          const delta = startPos.current - e.clientX
          const newWidth = Math.max(280, Math.min(700, startDim.current + delta))
          setChatPanelWidth(newWidth)
        }
      } else {
        // Bottom resizer (Terminal)
        const delta = startPos.current - e.clientY
        const newHeight = Math.max(100, Math.min(600, startDim.current + delta))
        setTerminalHeight(newHeight)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, direction, sidebarWidth, chatPanelWidth, terminalHeight, setSidebarWidth, setChatPanelWidth, setTerminalHeight])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`${direction === 'x' ? 'resizer-x' : 'resizer-y'} ${isDragging ? 'dragging' : ''}`}
      style={{
        userSelect: 'none',
        zIndex: 10,
      }}
    />
  )
}
