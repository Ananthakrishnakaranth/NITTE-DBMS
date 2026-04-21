import { motion as Motion } from 'framer-motion'
import { Music2, Disc3 } from 'lucide-react'
import { useDrop } from 'react-dnd'
import { SONG_DRAG_TYPE } from './SongCard'
import usePlayerStore from '../store/usePlayerStore'
import { genreGradient } from '../utils/colors'

export default function PlaylistCard({ playlist, onDropSong }) {
    const play = usePlayerStore((s) => s.play)

    const [{ canDrop, isOver }, dropRef] = useDrop(() => ({
        accept: SONG_DRAG_TYPE,
        drop: (item) => onDropSong(playlist.playlist_id, item.song_id),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [playlist.playlist_id, onDropSong])

    const isActive = canDrop && isOver

    return (
        <Motion.section
            ref={dropRef}
            layout
            className="rounded-2xl p-4 border"
            style={{
                background: isActive ? 'rgba(63,109,255,0.08)' : 'var(--color-surface)',
                borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                boxShadow: 'var(--shadow-soft)',
                backdropFilter: 'blur(12px)',
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: genreGradient(playlist.name) }}
                    >
                        <Music2 size={16} color="white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                            {playlist.name}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                            {playlist.songs?.length || 0} songs
                        </p>
                    </div>
                </div>

                {playlist.songs?.length > 0 && (
                    <button
                        onClick={() => play(playlist.songs[0])}
                        className="text-xs font-medium px-3 py-1.5 rounded-full"
                        style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                    >
                        Play
                    </button>
                )}
            </div>

            <div className="mt-3 space-y-1.5">
                {playlist.songs?.length ? (
                    playlist.songs.slice(0, 5).map((song) => (
                        <div key={song.song_id} className="flex items-center gap-2 text-xs rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.7)' }}>
                            <Disc3 size={13} style={{ color: 'var(--color-muted)' }} />
                            <span className="truncate" style={{ color: 'var(--color-text)' }}>{song.title}</span>
                            <span className="truncate ml-auto" style={{ color: 'var(--color-muted)' }}>{song.artist}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-xs rounded-lg p-3 text-center" style={{ color: 'var(--color-muted)', background: 'rgba(255,255,255,0.7)' }}>
                        Drop songs here
                    </div>
                )}
            </div>
        </Motion.section>
    )
}
