import React, { useEffect, useRef, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import './Feed.css'

const data = [
  {
    title: 'Image 1',
    background: '/images/backgrounds/background1.png',
    sections: [
      {
        text: 'Hello! I\'m the confluencer brain! \nThis shit is driving me bananas. I wanna vibe code myself out of existence',
        audio: '/audio/audio1.mp3',
        action: 'explaining1',
      }
    ]
  },
  {
    title: 'Image 2',
    background: '/images/backgrounds/background1.png',
    sections: [
      {
        text: 'This is the second image in the feed.',
        audio: '/audio/audio1.mp3',
        action: 'explaining2',
      }
    ]
  },
  {
    title: 'Image 3',
    background: '/images/backgrounds/background1.png',
    sections: [
      {
        text: 'This is the third image in the feed.',
        audio: '/audio/audio3.mp3',
        action: 'explaining3',
      }
    ]
  },
  {
    title: 'Image 4',
    background: '/images/backgrounds/background1.png',
    sections: [
      {
        text: 'This is the fourth image in the feed.',
        audio: '/audio/audio4.mp3',
        action: 'explaining4',
      }
    ]
  },
  {
    title: 'Image 5',
    background: '/images/backgrounds/background1.png',
    sections: [
      {
        text: 'This is the fifth image in the feed.',
        audio: '/audio/audio5.mp3',
        action: 'explaining5',
      }
    ]
  }
]

// Text overlay that fits in max 20% viewport height and chunks long text
// Also auto-advances pages in sync with audio progress (approx by words)
const TextOverlay = ({ text, audioRef, isActive = false }) => {
  const [pages, setPages] = useState([text || ''])
  const [pageIndex, setPageIndex] = useState(0)
  const measureRef = useRef(null)
  const pageRangesRef = useRef([]) // array of [startWordIdx, endWordIdxExclusive]
  const totalWordsRef = useRef(0)
  const showSentenceControls = false;

  const recompute = useCallback(() => {
    // Force one word per "page"
    const words = (text || '').trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      setPages([''])
      setPageIndex(0)
      pageRangesRef.current = []
      totalWordsRef.current = 0
      return
    }
    setPages(words)
    setPageIndex(0)
    pageRangesRef.current = words.map((_, i) => [i, i + 1])
    totalWordsRef.current = words.length
  }, [text])

  useEffect(() => {
    recompute()
  }, [recompute])

  // Reset page index when audio source changes (e.g., slide change)
  useEffect(() => {
    setPageIndex(0)
  }, [audioRef?.current?.currentSrc])

  // Also reset when this slide becomes active
  useEffect(() => {
    if (isActive) setPageIndex(0)
  }, [isActive])

  useEffect(() => {
    const onResize = () => recompute()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [recompute])

  // Auto-advance based on audio currentTime/duration mapped to word index
  useEffect(() => {
    if (!isActive) return
    const audio = audioRef?.current
    if (!audio) return

    const updateFromTime = () => {
      const duration = isFinite(audio.duration) ? audio.duration : 0
      if (!duration) { return }
      const totalWords = totalWordsRef.current || 0
      if (!totalWords) { return }
      const ratio = Math.max(0, Math.min(1, audio.currentTime / duration))
      const wordIdx = Math.floor(ratio * totalWords)
      const ranges = pageRangesRef.current || []
      if (!ranges.length) { return }
      // find the page containing this word index
      let idx = pages.length - 1
      for (let i = 0; i < ranges.length; i++) {
        const [s, e] = ranges[i]
        if (wordIdx >= s && wordIdx < e) {
          idx = i
          break
        }
      }
      if (!Number.isNaN(idx) && idx !== pageIndex) {
        setPageIndex(idx)
      }
    }

  // Reset to first page when audio ends
  const onEnded = () => setPageIndex(0)

    audio.addEventListener('timeupdate', updateFromTime)
    audio.addEventListener('seeked', updateFromTime)
    audio.addEventListener('loadedmetadata', updateFromTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateFromTime)
      audio.removeEventListener('seeked', updateFromTime)
      audio.removeEventListener('loadedmetadata', updateFromTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioRef, pages.length, pageIndex, isActive])

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '20%',
        transform: 'translateX(-50%)',
        width: '92%',
      }}
    >
      <div
        style={{
          color: '#fff',
          fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
          textTransform: 'uppercase',
          fontSize: 'clamp(18px, 5vw, 48px)',
          letterSpacing: '1px',
          lineHeight: 1.1,
          textAlign: 'center',
          padding: '0 8px',
          WebkitTextStroke: '2px #000',
          textShadow:
            '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000',
          maxHeight: '20vh',
          overflow: 'hidden',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {pages[pageIndex] || ''}
      </div>

      {/* hidden measurer with identical text styles and 20vh constraint */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          visibility: 'hidden',
          pointerEvents: 'none',
          color: '#fff',
          fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
          textTransform: 'uppercase',
          fontSize: 'clamp(18px, 5vw, 48px)',
          letterSpacing: '1px',
          lineHeight: 1.1,
          textAlign: 'center',
          padding: '0 8px',
          WebkitTextStroke: '2px #000',
          textShadow:
            '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000',
          maxHeight: '20vh',
          overflow: 'auto',
        }}
      />

      {pages.length > 1 && showSentenceControls && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setPageIndex((i) => (i + 1) % pages.length)
          }}
          style={{
            position: 'absolute',
            right: '12px',
            bottom: '12px',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.4)',
            fontSize: '12px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          aria-label="More text"
          title="More text"
        >
          {pageIndex + 1}/{pages.length}
        </button>
      )}
    </div>
  )
}

TextOverlay.propTypes = {
  text: PropTypes.string,
  audioRef: PropTypes.shape({ current: PropTypes.any }),
  isActive: PropTypes.bool,
}

function Feed() {

  const [current, setCurrent] = useState(0)

  const handleVisibleChange = useCallback((name, index) => {
    setCurrent(index)
    console.log('App visible image:', index + 1, name)
  }, [])

  // Audio playback for current image
  const audioRef = useRef(null)
  const containerRef = useRef(null)
  // total slides include an intro slide at index 0
  const totalSlides = data.length + 1
  // touch scroll coordination flags
  const isTouchingRef = useRef(false)
  const didNativeScrollRef = useRef(false)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      if (current > 0) {
        audioRef.current.play().catch((e) => { console.error('Audio playback error:', e) })
      }
    }
  }, [current])

  // When audio ends, restart from the beginning and play again
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      try {
        audio.currentTime = 0
        const p = audio.play()
        if (p && typeof p.catch === 'function') {
          p.catch((e) => console.error('Audio replay error:', e))
        }
      } catch (e) {
        console.error('Audio replay error:', e)
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [current])

  const scrollToIndex = useCallback((idx) => {
    if (!containerRef.current) return
    const clamped = Math.max(0, Math.min(totalSlides - 1, idx))
    containerRef.current.scrollTo({
      top: clamped * containerRef.current.clientHeight,
      behavior: 'smooth',
    })
  }, [totalSlides])

  const next = useCallback(() => scrollToIndex(current + 1), [current, scrollToIndex])
  const prev = useCallback(() => scrollToIndex(current - 1), [current, scrollToIndex])

  // when the visible image changes, notify parent (and fallback to console log)
  useEffect(() => {
    if (current >= 0 && current < totalSlides) {
      const name = current === 0 ? 'Intro' : data[current - 1].title;
      if (typeof handleVisibleChange === 'function') {
        handleVisibleChange(name, current)
      } else {
        console.log('Visible image:', name)
      }
    }
  }, [current, totalSlides, handleVisibleChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => {
      const h = el.clientHeight || 1
      const idx = Math.round(el.scrollTop / h)
      if (idx !== current) {
        if (isTouchingRef.current) {
          // mark that native scroll advanced during touch
          didNativeScrollRef.current = true
        }
        setCurrent(Math.max(0, Math.min(totalSlides - 1, idx)))
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    // focus for keyboard nav
    el.focus({ preventScroll: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [current, totalSlides])

  // keyboard
  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      next()
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      prev()
    }
  }, [next, prev])

  // touch (basic vertical swipe)
  const touchStartY = useRef(null)
  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0]?.clientY ?? 0
    isTouchingRef.current = true
    didNativeScrollRef.current = false
  }, [])
  const onTouchEnd = useCallback((e) => {
    const endY = e.changedTouches[0]?.clientY ?? 0
    const dy = endY - (touchStartY.current ?? 0)
    const threshold = 50
    if (didNativeScrollRef.current) {
      // native scroll already handled navigation during this touch
      isTouchingRef.current = false
      didNativeScrollRef.current = false
      touchStartY.current = null
      return
    }
    if (Math.abs(dy) > threshold) {
      if (dy < 0) next()
      else prev()
    }
    isTouchingRef.current = false
    didNativeScrollRef.current = false
    touchStartY.current = null
  }, [next, prev])

  // mouse drag support
  const isDragging = useRef(false)
  const mouseStartY = useRef(null)

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    // prevent text selection while dragging
    e.preventDefault()
  }, [])

  const onMouseUp = useCallback((e) => {
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
  }, [next, prev, onMouseMove])

  const onMouseDown = useCallback((e) => {
    mouseStartY.current = e.clientY
    isDragging.current = true
    containerRef.current?.classList.add('dragging')
    window.addEventListener('mousemove', onMouseMove, { passive: false })
    window.addEventListener('mouseup', onMouseUp)
  }, [onMouseMove, onMouseUp])

  // Imperatively attach interactions to avoid a11y JSX warnings on non-interactive elements
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onClick = (e) => {
      const target = e.target
      const frame = target && typeof target.closest === 'function' ? target.closest('.feed-frame') : null
      if (!frame) return
      const idxAttr = frame.getAttribute('data-index')
      const idx = idxAttr ? parseInt(idxAttr, 10) : NaN
      if (!Number.isNaN(idx) && idx === current) {
        const a = audioRef.current
        if (!a) return
        if (!a.paused) {
          a.pause()
        } else if (current > 0) {
          // resume
          const p = a.play()
          if (p && typeof p.catch === 'function') {
            p.catch((err) => console.error('Audio resume error:', err))
          }
        }
      }
    }
    // touch
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    // mouse
    el.addEventListener('mousedown', onMouseDown)
    // click/tap to pause
    el.addEventListener('click', onClick)
    // keyboard on window
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onTouchStart, onTouchEnd, onMouseDown, onKeyDown, current])

  return (
    <div
      className="feed-container"
      ref={containerRef}
      role="application"
      aria-label="Feed content"
    >
      {/* Audio element for current image */}
      <audio
        ref={audioRef}
        src={current > 0 ? data[current - 1].sections[0].audio : null}
        preload="auto"
      >
        <track
          kind="captions"
          srcLang="en"
          label="English captions"
          src="data:text/vtt,WEBVTT"
          default
        />
      </audio>
      {/* Intro slide */}
      <div className="feed-item" key="_intro">
        <div className="feed-frame" data-index={0} style={{ position: 'relative', background: '#000', minHeight: '100%' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontFamily: 'Inter, Arial, sans-serif',
              fontSize: 'clamp(18px, 4vw, 36px)',
              textAlign: 'center',
              userSelect: 'none',
              padding: '0 16px',
            }}
          >
            Swipe to start
          </div>
        </div>
      </div>
      {data.map((item, index) => (
        <div className="feed-item" key={item.title}>
          <div className="feed-frame" data-index={index + 1} style={{ position: 'relative' }}>
            <img
              src={item.background}
              alt={`Feed ${index + 1}`}
              draggable={false}
              style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none', pointerEvents: 'none' }}
            />

            <TextOverlay
              text={item.sections[0].text}
              audioRef={audioRef}
              isActive={current === index + 1}
            />
          </div>
        </div>
      ))}

      <div className="feed-hud">
        <div className="pill">{current + 1} / {totalSlides}</div>
        <div className="hint">↑/↓ or swipe</div>
      </div>
    </div>
  )
}

export default Feed
