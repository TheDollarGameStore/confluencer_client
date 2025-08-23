import React, { useEffect, useRef, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import './Feed.css'

const data = [
  {
    title: 'Image 1',
    background: '/images/img1.svg',
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
    background: '/images/img2.svg',
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
    background: '/images/img3.svg',
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
    background: '/images/img4.svg',
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
    background: '/images/img5.svg',
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
const TextOverlay = ({ text, audioRef }) => {
  const [pages, setPages] = useState([text || ''])
  const [pageIndex, setPageIndex] = useState(0)
  const measureRef = useRef(null)
  const pageRangesRef = useRef([]) // array of [startWordIdx, endWordIdxExclusive]
  const totalWordsRef = useRef(0)

  const recompute = useCallback(() => {
    const el = measureRef.current
    if (!el) return
    const words = (text || '').trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      setPages([''])
      setPageIndex(0)
      pageRangesRef.current = []
      totalWordsRef.current = 0
      return
    }
    // build pages by finding the longest slice that fits into 20vh
    const out = []
    const ranges = []
    let start = 0
    const fits = (s, e) => {
      el.innerText = words.slice(s, e).join(' ')
      // allow tiny epsilon
      return el.scrollHeight <= el.clientHeight + 1
    }
    while (start < words.length) {
      let low = start + 1
      let high = words.length
      let best = low
      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        if (fits(start, mid)) {
          best = mid
          low = mid + 1
        } else {
          high = mid - 1
        }
      }
      if (best <= start) best = Math.min(start + 1, words.length)
      out.push(words.slice(start, best).join(' '))
      ranges.push([start, best])
      start = best
    }
    el.innerText = ''
    setPages(out)
    setPageIndex(0)
    pageRangesRef.current = ranges
    totalWordsRef.current = words.length
  }, [text])

  useEffect(() => {
    recompute()
  }, [recompute])

  useEffect(() => {
    const onResize = () => recompute()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [recompute])

  // Auto-advance based on audio currentTime/duration mapped to word index
  useEffect(() => {
    const audio = audioRef?.current
    if (!audio) return

    const updateFromTime = () => {
      const duration = isFinite(audio.duration) ? audio.duration : 0
      if (!duration) return
      const totalWords = totalWordsRef.current || 0
      if (!totalWords) return
      const ratio = Math.max(0, Math.min(1, audio.currentTime / duration))
      const wordIdx = Math.floor(ratio * totalWords)
      const ranges = pageRangesRef.current || []
      if (!ranges.length) return
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

    // Reset to first page when a new audio starts playing
    const onPlay = () => setPageIndex(0)
    const onEnded = () => setPageIndex(pages.length - 1)

    audio.addEventListener('timeupdate', updateFromTime)
    audio.addEventListener('seeked', updateFromTime)
    audio.addEventListener('loadedmetadata', updateFromTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateFromTime)
      audio.removeEventListener('seeked', updateFromTime)
      audio.removeEventListener('loadedmetadata', updateFromTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioRef, pages.length, pageIndex])

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '8%',
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

      {pages.length > 1 && (
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
  audioRef: PropTypes.shape({ current: PropTypes.any })
}

function Feed() {

  const [current, setCurrent] = useState(0)

  const handleVisibleChange = useCallback((name, index) => {
    setCurrent(index)
    console.log('App visible image:', index + 1, name)
  }, [])

  // Audio playback for current image
  const audioRef = useRef(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((e) => { console.error('Audio playback error:', e) })
    }
  }, [current])


  const containerRef = useRef(null)
  const total = data.length

  const scrollToIndex = useCallback((idx) => {
    if (!containerRef.current) return
    const clamped = Math.max(0, Math.min(total - 1, idx))
    containerRef.current.scrollTo({
      top: clamped * containerRef.current.clientHeight,
      behavior: 'smooth',
    })
  }, [total])

  const next = useCallback(() => scrollToIndex(current + 1), [current, scrollToIndex])
  const prev = useCallback(() => scrollToIndex(current - 1), [current, scrollToIndex])

  // when the visible image changes, notify parent (and fallback to console log)
  useEffect(() => {
    if (current >= 0 && current < total) {
      const name = data[current].title;
      if (typeof handleVisibleChange === 'function') {
        handleVisibleChange(name, current)
      } else {
        console.log('Visible image:', name)
      }
    }
  }, [current, total, handleVisibleChange])

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
  }, [])
  const onTouchEnd = useCallback((e) => {
    const endY = e.changedTouches[0]?.clientY ?? 0
    const dy = endY - (touchStartY.current ?? 0)
    const threshold = 50
    if (Math.abs(dy) > threshold) {
      if (dy < 0) next()
      else prev()
    }
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

  console.log('Render Feed, current:', current);
  console.log('Render Feed, audio src:', data[current].sections[0].audio);

  // Imperatively attach interactions to avoid a11y JSX warnings on non-interactive elements
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // touch
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    // mouse
    el.addEventListener('mousedown', onMouseDown)
    // keyboard on window
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onTouchStart, onTouchEnd, onMouseDown, onKeyDown])

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
        src={data[current].sections[0].audio}
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
      {data.map((item, index) => (
        <div className="feed-item" key={item.title}>
          <div className="feed-frame" style={{ position: 'relative' }}>
            <img
              src={item.background}
              alt={`Feed ${index + 1}`}
              draggable={false}
              style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none', pointerEvents: 'none' }}
            />
            <TextOverlay text={item.sections[0].text} audioRef={audioRef} />
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
