import { motion as Motion } from 'framer-motion'
import { greeting } from '../utils/colors'
import { useSongs } from '../hooks/useSongs'
import SongCard from '../components/SongCard'

export default function Home() {
    const { data: songs = [], isLoading, error } = useSongs()

    return (
        <div className="px-6 py-6">
            <header className="mb-6">
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{greeting()}</h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>Pick a track and the player will keep your queue rolling.</p>
            </header>

            {isLoading && <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading songs...</p>}
            {error && <p className="text-sm" style={{ color: '#d64f70' }}>{error.message}</p>}

            <Motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {songs.map((song, i) => (
                    <Motion.div key={song.song_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                        <SongCard song={song} />
                    </Motion.div>
                ))}
            </Motion.div>
        </div>
    )
}
