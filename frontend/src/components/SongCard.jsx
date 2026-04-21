import { motion as Motion } from 'framer-motion'
import { Play, Plus } from 'lucide-react'
import { useDrag } from 'react-dnd'
import usePlayerStore from '../store/usePlayerStore'
import { genreGradient, fmt } from '../utils/colors'

export const SONG_DRAG_TYPE = 'SONG'

export default function SongCard({ song, badge }) {
  const play = usePlayerStore((s) => s.play)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const gradient = genreGradient(song.genre || song.title)

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: SONG_DRAG_TYPE,
    item: song,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }))

  return (
    <Motion.div
      ref={dragRef}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-soft)',
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Gradient cover */}
      <div
        className="relative w-full aspect-square"
        style={{ background: gradient }}
        onClick={() => play(song)}
      >
        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <Motion.div
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1 }}
            animate={{ scale: 1 }}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(63,109,255,0.95)', boxShadow: '0 8px 24px rgba(63,109,255,0.45)' }}
          >
            <Play size={20} fill="white" color="white" />
          </Motion.div>
        </div>

        {/* Badge */}
        {badge && (
          <div
            className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--color-accent)' }}
          >
            {badge}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            addToQueue(song)
          }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--color-accent)' }}
          title="Add to queue"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
          {song.title}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>
          {song.artist}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {song.genre || 'Unknown'}
          </span>
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted)' }}>
            {fmt(song.duration_seconds)}
          </span>
        </div>
      </div>
    </Motion.div>
  )
}
