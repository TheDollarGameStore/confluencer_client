import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { ACTIONS } from '../enums/actions.js'
import PropTypes from 'prop-types'
import './Feed.css'
import useBackblazeAudio from '../hooks/useBackblazeAudio.js'

// Helper to adapt API results to local slide structure (one slide per item, keep sections)
function adaptSummariesToSlides(items) {
  const fallbackBg = '/images/backgrounds/background1.png'
  console.log('Raw summaries from API:', items)
  if (!Array.isArray(items)) return []
  return items.map((it, i) => {
    const title = it?.title || it?.name || `Post ${i + 1}`
    const background = it?.background || fallbackBg
    // Normalize sections to [{ text, audio, action }]
    let sections = []
    if (Array.isArray(it?.sections) && it.sections.length) {
      sections = it.sections.map((s) => ({
        text: s?.text || '',
        audio: s?.audio || s?.audioUrl || s?.audioKey || '',
        action: s?.action || 'thinking',
      }))
    } else {
      sections = [{
        text: it?.text || it?.summary || '',
        audio: it?.audio || it?.audioUrl || it?.audioKey || '',
        action: it?.action || 'thinking',
      }]
    }
    return { title, background, sections }
  })
}

// Text overlay that shows one word at a time, synced with audio
const TextOverlay = ({ text, audioRef, isActive = false, onWordChange }) => {
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

  // Notify parent whenever the visible word changes
  useEffect(() => {
    if (!isActive) return
    if (typeof onWordChange === 'function') {
      onWordChange(pageIndex)
    }
  }, [pageIndex, isActive, onWordChange])


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
          WebkitTextStroke: 'clamp(1px, 0.04em, 2px) #000',
          textShadow:
            'clamp(1px, 0.04em, 2px) clamp(1px, 0.04em, 2px) 0 #000, clamp(-1px, -0.04em, -2px) clamp(1px, 0.04em, 2px) 0 #000, clamp(1px, 0.04em, 2px) clamp(-1px, -0.04em, -2px) 0 #000, clamp(-1px, -0.04em, -2px) clamp(-1px, -0.04em, -2px) 0 #000, 0 clamp(1px, 0.04em, 2px) 0 #000, clamp(1px, 0.04em, 2px) 0 0 #000, 0 clamp(-1px, -0.04em, -2px) 0 #000, clamp(-1px, -0.04em, -2px) 0 0 #000',
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
          WebkitTextStroke: 'clamp(1px, 0.04em, 2px) #000',
          textShadow:
            'clamp(1px, 0.04em, 2px) clamp(1px, 0.04em, 2px) 0 #000, clamp(-1px, -0.04em, -2px) clamp(1px, 0.04em, 2px) 0 #000, clamp(1px, 0.04em, 2px) clamp(-1px, -0.04em, -2px) 0 #000, clamp(-1px, -0.04em, -2px) clamp(-1px, -0.04em, -2px) 0 #000, 0 clamp(1px, 0.04em, 2px) 0 #000, clamp(1px, 0.04em, 2px) 0 0 #000, 0 clamp(-1px, -0.04em, -2px) 0 #000, clamp(-1px, -0.04em, -2px) 0 0 #000',
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
  onWordChange: PropTypes.func,
}

function Feed() {

  const [current, setCurrent] = useState(0)
  const [slides, setSlides] = useState([])
  const [sectionIndex, setSectionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [swipeCount, setSwipeCount] = useState(0)
  const [backgroundVideo, setBackgroundVideo] = useState(null)
  const [videoReady, setVideoReady] = useState(false)

  const handleSwipe = useCallback(() => {
    setSwipeCount((prev) => prev + 1);
  }, []);

  const handleVisibleChange = useCallback((name, index) => {
    setCurrent(index)
    console.log('App visible image:', index + 1, name)
  }, [])

  // Reset readiness when background video source changes
  useEffect(() => {
    setVideoReady(false)
  }, [backgroundVideo])

  // Audio playback for current image
  const audioRef = useRef(null)
  const containerRef = useRef(null)
  // Hold preloaded <video> elements to keep them in memory
  const preloadedVideosRef = useRef(new Map())
  const preloadedAudioRef = useRef(new Map())
  // total slides include an intro slide at index 0
  const totalSlides = slides.length + 1
  // touch scroll coordination flags
  const isTouchingRef = useRef(false)
  const didNativeScrollRef = useRef(false)

  // Backblaze configuration from env or provided defaults
  const b2Config = useMemo(() => ({
    bucket: import.meta.env.VITE_B2_BUCKET || 'confluenceraudio',
    key: import.meta.env.VITE_B2_KEY || '',
    secret: import.meta.env.VITE_B2_SECRET || '',
    region: import.meta.env.VITE_B2_REGION || 'us-east-005',
    endpoint: import.meta.env.VITE_B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    forcePathStyle: false,
    publicUrlBase: import.meta.env.VITE_B2_PUBLIC_URL_BASE || 'https://f005.backblazeb2.com/file/confluenceraudio',
  }), [])

  const b2 = useBackblazeAudio(b2Config)

  // API base: use env in production, fall back to dev proxy
  const apiBase = useMemo(() => {
    const fromEnv = (import.meta.env.VITE_API_BASE_URL || '').trim()
    if (fromEnv) return fromEnv.replace(/\/$/, '')
    return '/api'
  }, [])

  // Turn a local-ish path like "/audio/audio1.mp3" into an object key "audio/audio1.mp3"
  const toObjectKey = useCallback((p) => (p || '').replace(/^\//, ''), [])

  // Reset section when slide changes
  useEffect(() => {
    setSectionIndex(0)
  }, [current])

  // Helper to resolve an audio reference to a playable URL
  const resolveAudioUrl = useCallback((raw) => {
    const val = raw || ''
    if (/^(https?:|blob:)/i.test(val)) return val
    const key = toObjectKey(val)
    if (!key) return null
    const base = (b2Config.publicUrlBase || '').replace(/\/$/, '')
    if (base) return `${base}/${key}`
    return b2?.buildPublicUrl ? b2.buildPublicUrl(key) : null
  }, [toObjectKey, b2Config.publicUrlBase, b2])

  // Build the audio URL for the current slide's current section using Backblaze
  const audioSrc = useMemo(() => {
    if (current <= 0) return null
    const slide = slides[current - 1]
    const section = slide?.sections?.[sectionIndex]
    return resolveAudioUrl(section?.audio || '')
  }, [current, sectionIndex, slides, resolveAudioUrl])

  // Fetch slides from backend API
  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(`${apiBase}/summaries`, { credentials: 'omit' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const mapped = adaptSummariesToSlides(json)
        if (!cancelled) setSlides(mapped)
      } catch (e) {
        console.error('Failed to load summaries:', e)
        if (!cancelled) setLoadError(String(e.message || e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Manual reload (e.g., user taps intro when error)
  const reloadSlides = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`${apiBase}/summaries`, { credentials: 'omit' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const mapped = adaptSummariesToSlides(json)
      setSlides(mapped)
    } catch (e) {
      console.error('Failed to load summaries (retry):', e)
      setLoadError(String(e.message || e))
    } finally {
      setIsLoading(false)
    }
  }, [apiBase])

  // Start/restart audio when slide or section changes
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.pause()
    a.currentTime = 0
    if (current > 0 && audioSrc) {
      a.load()
      a.play().catch((e) => { console.error('Audio playback error:', e) })
    }
  }, [current, audioSrc])

  const scrollToIndex = useCallback((idx) => {
    if (!containerRef.current) return
    const clamped = Math.max(0, Math.min(totalSlides - 1, idx))
    containerRef.current.scrollTo({
      top: clamped * containerRef.current.clientHeight,
      behavior: 'smooth',
    })
  }, [totalSlides])

  // When audio ends: advance to next section within slide, else move to next slide or loop
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      try {
        if (current <= 0) return
        const slide = slides[current - 1]
        const totalSections = slide?.sections?.length || 0
        if (sectionIndex + 1 < totalSections) {
          setSectionIndex((i) => i + 1)
        } else if (current < totalSlides - 1) {
          scrollToIndex(current + 1)
        } else {
          // Loop last slide
          setSectionIndex(0)
          audio.currentTime = 0
          const p = audio.play()
          if (p && typeof p.catch === 'function') {
            p.catch((e) => console.error('Audio replay error:', e))
          }
        }
      } catch (e) {
        console.error('Audio ended handler error:', e)
      }
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [current, totalSlides, scrollToIndex, slides, sectionIndex])

  const next = useCallback(() => scrollToIndex(current + 1), [current, scrollToIndex])
  const prev = useCallback(() => scrollToIndex(current - 1), [current, scrollToIndex])

  // when the visible image changes, notify parent (and fallback to console log)
  useEffect(() => {
    if (current >= 0 && current < totalSlides) {
      const name = current === 0 ? 'Intro' : slides[current - 1]?.title;
      if (typeof handleVisibleChange === 'function') {
        handleVisibleChange(name, current)
      } else {
        console.log('Visible image:', name)
      }
    }
  }, [current, totalSlides, handleVisibleChange, slides])

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
      // count this as a swipe
      handleSwipe()
    }
    isTouchingRef.current = false
    didNativeScrollRef.current = false
    touchStartY.current = null
  }, [next, prev, handleSwipe])

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
      // count this as a swipe
      handleSwipe()
    }
    isDragging.current = false
    mouseStartY.current = null
    containerRef.current?.classList.remove('dragging')
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [next, prev, onMouseMove, handleSwipe])

  const onMouseDown = useCallback((e) => {
    mouseStartY.current = e.clientY
    isDragging.current = true
    containerRef.current?.classList.add('dragging')
    window.addEventListener('mousemove', onMouseMove, { passive: false })
    window.addEventListener('mouseup', onMouseUp)
  }, [onMouseMove, onMouseUp])

  // Helper: toggle audio play/pause for the current slide
  const toggleAudio = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (!a.paused) {
      a.pause()
      return
    }
    if (current > 0) {
      const p = a.play()
      if (p && typeof p.catch === 'function') {
        p.catch((err) => console.error('Audio resume error:', err))
      }
    }
  }, [current])

  // Imperatively attach interactions to avoid a11y JSX warnings on non-interactive elements
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onClick = (e) => {
      const frame = e.target && typeof e.target.closest === 'function' ? e.target.closest('.feed-frame') : null
      if (!frame) return
      const idxAttr = frame.getAttribute('data-index')
      const idx = idxAttr ? parseInt(idxAttr, 10) : NaN
      if (!Number.isFinite(idx)) return
      if (idx === 0) {
        if (loadError) { reloadSlides(); return }
        if (isLoading) { return }
        scrollToIndex(1); return
      }
      if (idx !== current) return
      toggleAudio()
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
  }, [onTouchStart, onTouchEnd, onMouseDown, onKeyDown, current, scrollToIndex, toggleAudio, isLoading, loadError, reloadSlides])

  // Prefetch audio for current slide and next 3 slides (all sections)
  useEffect(() => {
    // Determine slide indices to prefetch (skip intro at 0)
    const start = Math.max(1, current)
    const end = Math.min(slides.length, start + 3)
    for (let i = start; i <= end; i++) {
      const slide = slides[i - 1]
      const sections = Array.isArray(slide?.sections) ? slide.sections : []
      sections.forEach((s) => {
        const url = resolveAudioUrl(s?.audio || '')
        if (!url || preloadedAudioRef.current.has(url)) return
        try {
          const a = document.createElement('audio')
          a.src = url
          a.preload = 'auto'
          a.crossOrigin = 'anonymous'
          a.load()
          preloadedAudioRef.current.set(url, a)
        } catch (e) {
          console.warn('Audio prefetch failed:', e)
        }
      })
    }
  }, [current, slides, resolveAudioUrl])

  // Dynamically fetch video list (hardcoded for now, but can be replaced with an API call)
  const fetchVideoList = () => {
    return [
      '/video/subwaySurfers.mp4',
      // Add more video paths here as they are added to the folder
    ];
  };

  // Prefetch a few background videos to avoid first-play stutter
  useEffect(() => {
    const videoList = fetchVideoList();
    const maxPrefetch = 2; // limit prefetch to reduce bandwidth
    videoList.slice(0, maxPrefetch).forEach((url) => {
      if (!url || preloadedVideosRef.current.has(url)) return;
      try {
        const v = document.createElement('video');
        v.src = url;
        v.preload = 'auto';
        v.muted = true;
        v.playsInline = true;
        // Kick off buffering
        v.load();
        preloadedVideosRef.current.set(url, v);
      } catch (e) {
        console.warn('Video prefetch failed:', e);
      }
    });
  }, [])

  useEffect(() => {
    if (swipeCount >= 5) { // Threshold for too many swipes
      const videoList = fetchVideoList();
      const randomVideo = videoList[Math.floor(Math.random() * videoList.length)];
      setBackgroundVideo(randomVideo);
      setSwipeCount(0); // Reset swipe count
    }
  }, [swipeCount]);

  useEffect(() => {
    const resetSwipeCount = setInterval(() => setSwipeCount(0), 10000); // Reset every 10 seconds
    return () => clearInterval(resetSwipeCount);
  }, []);

  console.log({
    swipeCount,
    backgroundVideo,
  })
  return (
    <div
      className="feed-container"
      ref={containerRef}
      role="application"
      aria-label="Feed content"
    >
      {/** Intro label text derived to avoid nested ternary in JSX */}
      {(() => {
        /* no-op IIFE to keep local scoped consts without extra renders */
      })()}
      {/* Audio element for current image */}
      <audio
        ref={audioRef}
        src={audioSrc}
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
          {backgroundVideo && (
            <video
              className="feed-video"
              src={backgroundVideo}
              preload="auto"
              autoPlay
              loop
              muted
              playsInline
              onCanPlay={() => setVideoReady(true)}
              style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 200ms ease' }}
            />
          )}
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
            {(() => {
              if (isLoading) return 'Loading…'
              if (loadError) return 'Tap to retry'
              return 'Tap to start'
            })()}
          </div>
        </div>
      </div>
      {slides.map((slide, index) => {
        const isActive = current === index + 1
        const visibleSectionIdx = isActive ? sectionIndex : 0
        const section = slide.sections?.[visibleSectionIdx] || { text: '', action: 'thinking' }
        const actionKey = section.action
        const poseFile = ACTIONS[actionKey] || ACTIONS.thinking
        const poseSrc = `/images/poses/brain/${poseFile}`
        return (
          <div className="feed-item" key={`${slide.title}-${index}`}>
            <div className="feed-frame" data-index={index + 1} style={{ position: 'relative' }}>
              {/* Always keep the image as a fallback underneath for smooth transition */}
              <img
                src={slide.background}
                alt={`Feed ${index + 1}`}
                draggable={false}
                style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none', pointerEvents: 'none' }}
              />
              {backgroundVideo && (
                <video
                  className="feed-video"
                  src={backgroundVideo}
                  preload="auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                  onCanPlay={() => setVideoReady(true)}
                  style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 200ms ease' }}
                />
              )}
              <div
                className="pose-wrap"
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '30%',
                  width: '90%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  zIndex: 2,
                }}
              >
                <img
                  src={poseSrc}
                  alt={actionKey ? `${actionKey} pose` : 'pose'}
                  draggable={false}
                  className="pose-img"
                  style={{
                    flex: '1 0 100%',
                    height: 'auto',
                    width: 'auto',
                    maxWidth: '90%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              </div>

              <TextOverlay
                text={section.text}
                audioRef={audioRef}
                isActive={isActive}
                onWordChange={() => {
                  const sel = `.feed-frame[data-index="${index + 1}"] .pose-img`
                  const el = document.querySelector(sel)
                  if (!el) {
                    return
                  }
                  el.classList.remove('bob')
                  // force reflow to restart CSS animation reliably
                  el.getBoundingClientRect()
                  el.classList.add('bob')
                }}
              />
            </div>
          </div>
        )
      })}

      <div className="feed-hud">
        <div
          className="feed-hud-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            width: '100%',
            padding: '0 12px',
            boxSizing: 'border-box',
          }}
        >
          <span
            className="hud-title"
            style={{
              color: '#E6EDF3',
              fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif',
              fontSize: 'clamp(12px, 2.5vw, 18px)',
              letterSpacing: '0.5px',
              lineHeight: 1.2,
              userSelect: 'none',
              pointerEvents: 'none',
              opacity: 0.95,
              flex: '1 1 auto',
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            href={current > 0 ? slides[current - 1]?.sourceUrl : undefined}
            aria-label="Slide title"
          >
            {current > 0 ? (slides[current - 1]?.title || '') : ''}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <div className="pill">{current + 1} / {totalSlides}</div>
            <div className="hint">↑/↓ or swipe</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Feed
