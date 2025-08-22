import React, { useEffect, useRef, useState } from 'react'
import './Feed.css'

const images = [
  '/images/img1.svg',
  '/images/img2.svg',
  '/images/img3.svg',
  '/images/img4.svg',
  '/images/img5.svg',
]

function Feed({ onVisibleChange }) {
  const containerRef = useRef(null)
  const [current, setCurrent] = useState(0)
  const total = images.length

  const scrollToIndex = (idx) => {
    if (!containerRef.current) return
    const clamped = Math.max(0, Math.min(total - 1, idx))
    containerRef.current.scrollTo({
      top: clamped * containerRef.current.clientHeight,
      behavior: 'smooth',
    })
  }

  const next = () => scrollToIndex(current + 1)
  const prev = () => scrollToIndex(current - 1)

  // when the visible image changes, notify parent (and fallback to console log)
  useEffect(() => {
    if (current >= 0 && current < total) {
      const name = images[current]
      if (typeof onVisibleChange === 'function') {
        try { onVisibleChange(name, current) } catch (e) { /* noop */ }
      } else {
        console.log('Visible image:', name)
      }
    }
  }, [current, total, onVisibleChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => {
      const h = el.clientHeight || 1
      const idx = Math.round(el.scrollTop / h)
      if (idx !== current) setCurrent(Math.max(0, Math.min(total - 1, idx)))
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    // focus for keyboard nav
    el.focus({ preventScroll: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [current, total])

  // keyboard 
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      next()
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      prev()
    }
  }

  // touch (basic vertical swipe)
  const touchStartY = useRef(null)
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0]?.clientY ?? 0
  }
  const onTouchEnd = (e) => {
    const endY = e.changedTouches[0]?.clientY ?? 0
    const dy = endY - (touchStartY.current ?? 0)
    const threshold = 50
    if (Math.abs(dy) > threshold) {
      if (dy < 0) next()
      else prev()
    }
    touchStartY.current = null
  }

  // mouse drag support
  const isDragging = useRef(false)
  const mouseStartY = useRef(null)

  const onMouseDown = (e) => {
    mouseStartY.current = e.clientY
    isDragging.current = true
    containerRef.current?.classList.add('dragging')
    window.addEventListener('mousemove', onMouseMove, { passive: false })
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e) => {
    if (!isDragging.current) return
    // prevent text selection while dragging
    e.preventDefault()
  }

  const onMouseUp = (e) => {
    if (!isDragging.current) return
    const endY = e.clientY
    const dy = endY - (mouseStartY.current ?? 0)
    const threshold = 50
    if (Math.abs(dy) > threshold) {
      if (dy < 0) next()
      else prev()
    }
    isDragging.current = false
    mouseStartY.current = null
    containerRef.current?.classList.remove('dragging')
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className="feed-container"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
  onMouseDown={onMouseDown}
    >
      {images.map((src, index) => (
        <div className="feed-item" key={index}>
          <div className="feed-frame">
            <img src={src} alt={`Feed ${index + 1}`} draggable={false} />
          </div>
        </div>
      ))}

      <div className="feed-hud">
        <div className="pill">{current + 1} / {total}</div>
        <div className="hint">↑/↓ or swipe</div>
      </div>
    </div>
  )
}

export default Feed
