import { useRef, useEffect, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  ThumbsUp, ThumbsDown, ListMusic, X,
} from 'lucide-react'
import usePlayerStore from '../store/usePlayerStore'
import { genreGradient } from '../utils/colors'

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function postFeedback(songId, feedback) {
  await fetch('/api/feedback', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId, feedback }),
  })
}

async function logSongPlay(songId, listenDurationSeconds = 180, isSkip = false) {
  // Ensure valid duration - for skips, use minimum 1 second if duration is 0
  let duration = Math.round(listenDurationSeconds || 0)
  if (isSkip && duration < 1) duration = 1
  
  try {
    const res = await fetch(`/api/play/${songId}/log`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listen_duration_seconds: duration }),
    })
    if (!res.ok) {
      console.warn(`Failed to log song ${songId}: ${res.status}`)
    }
  } catch (err) {
    console.error(`Error logging song ${songId}:`, err)
  }
}

export default function PlayerBar() {
  const audioRef = useRef(null)
  const { nowPlaying, isPlaying, volume, currentTime, duration, queue,
    pause, resume, next, prev, seek, setVolume, setCurrentTime, setDuration } = usePlayerStore()

  const [showQueue, setShowQueue] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)

  // Sync audio element with store
  useEffect(() => {
    if (!audioRef.current || !nowPlaying) return
    const src = `/stream/${nowPlaying.song_id}`
    if (audioRef.current.src !== window.location.origin + src) {
      audioRef.current.src = src
      audioRef.current.load()
    }
    if (isPlaying) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }, [nowPlaying, isPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime)
  }
  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration)
  }
  const handleEnded = () => {
    if (nowPlaying) {
      logSongPlay(nowPlaying.song_id, currentTime)
    }
    next()
  }

  const handleSeek = (e) => {
    const t = Number(e.target.value)
    audioRef.current.currentTime = t
    seek(t)
  }

  const handleLike = () => {
    if (!nowPlaying) return
    setLiked(true)
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 600)
    postFeedback(nowPlaying.song_id, 'like')
  }

  const handleSkip = () => {
    if (!nowPlaying) return
    logSongPlay(nowPlaying.song_id, currentTime, true) // true = isSkip, ensures minimum 1 second logged
    postFeedback(nowPlaying.song_id, 'skip')
    next()
  }

  if (!nowPlaying) {
    return (
      <div
        className="fixed bottom-0 right-0 h-20 flex items-center justify-center z-50"
        style={{
          left: 'var(--sidebar-width)',
          background: 'rgba(250,253,255,0.86)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Select a song to start listening
        </span>
      </div>
    )
  }

  const gradient = genreGradient(nowPlaying.genre || '')

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <Motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 right-0 z-50"
        style={{
          left: 'var(--sidebar-width)',
          height: '80px',
          background: 'rgba(248, 252, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 -4px 30px rgba(56,84,130,0.1)',
        }}
      >
        <div className="flex items-center h-full px-6 gap-6">
          {/* Album art + info */}
          <div className="flex items-center gap-3 min-w-0" style={{ width: '240px', flexShrink: 0 }}>
            <div
              className="w-12 h-12 rounded-lg flex-shrink-0"
              style={{ background: gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {nowPlaying.title}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>
                {nowPlaying.artist}
              </p>
            </div>
          </div>

          {/* Centre controls */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-4">
              <button
                onClick={prev}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: 'var(--color-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={isPlaying ? pause : resume}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: 'var(--color-accent)', color: 'white', boxShadow: '0 8px 18px rgba(63,109,255,0.35)' }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
              </button>

              <button
                onClick={next}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: 'var(--color-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Seek bar */}
            <div className="flex items-center gap-2 w-full max-w-lg">
              <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted)', minWidth: '34px', textAlign: 'right' }}>
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  step={1}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent) ${duration ? (currentTime / duration) * 100 : 0}%, #d6e1ef 0%)`,
                  }}
                />
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted)', minWidth: '34px' }}>
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3" style={{ width: '240px', justifyContent: 'flex-end', flexShrink: 0 }}>
            {/* Like */}
            <Motion.button
              onClick={handleLike}
              animate={likeAnim ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.4 }}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: liked ? 'var(--color-accent)' : 'var(--color-muted)' }}
              title="Like"
            >
              <ThumbsUp size={17} fill={liked ? 'var(--color-accent)' : 'none'} />
            </Motion.button>

            {/* Skip / dislike */}
            <button
              onClick={handleSkip}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: 'var(--color-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e85d75')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-muted)')}
              title="Skip"
            >
              <ThumbsDown size={17} />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                style={{ color: 'var(--color-muted)' }}
              >
                {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{ width: '70px', background: `linear-gradient(to right, var(--color-accent) ${volume * 100}%, #d6e1ef 0%)` }}
              />
            </div>

            {/* Queue toggle */}
            <button
              onClick={() => setShowQueue((v) => !v)}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: showQueue ? 'var(--color-accent)' : 'var(--color-muted)' }}
              title="Queue"
            >
              <ListMusic size={17} />
            </button>
          </div>
        </div>
      </Motion.div>

      {/* Queue Popover */}
      <AnimatePresence>
        {showQueue && (
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-50 rounded-2xl overflow-hidden"
            style={{
              width: 'min(360px, calc(100vw - 1.5rem))',
              maxHeight: '400px',
              background: 'rgba(250, 253, 255, 0.92)',
              boxShadow: '0 20px 60px rgba(43, 74, 122, 0.24)',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Queue</h3>
              <button onClick={() => setShowQueue(false)} style={{ color: 'var(--color-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
              {queue.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-muted)' }}>Queue is empty</p>
              ) : (
                queue.map((song, i) => (
                  <div
                    key={song.song_id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{
                      background: nowPlaying?.song_id === song.song_id ? 'rgba(63,109,255,0.08)' : 'transparent',
                    }}
                  >
                    <span className="text-xs w-4 text-center" style={{ color: 'var(--color-muted)' }}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{song.title}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{song.artist}</p>
                    </div>
                    {nowPlaying?.song_id === song.song_id && (
                      <div className="ml-auto flex gap-0.5">
                        {[0, 1, 2].map((bar) => (
                          <Motion.div
                            key={bar}
                            className="w-0.5 rounded-full"
                            style={{ background: 'var(--color-accent)' }}
                            animate={{ height: [6, 14, 6] }}
                            transition={{ duration: 0.8, delay: bar * 0.15, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
