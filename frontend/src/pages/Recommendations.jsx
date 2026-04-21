import { Sparkles } from 'lucide-react'
import { useRecommendations } from '../hooks/useRecommendations'
import SongCard from '../components/SongCard'

export default function Recommendations() {
    const { data = [], isLoading, error } = useRecommendations()

    return (
        <div className="px-6 py-6">
            <div className="flex items-center gap-2 mb-5">
                <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>For You</h1>
            </div>

            {isLoading && <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Building your recommendations...</p>}
            {error && <p className="text-sm" style={{ color: '#d64f70' }}>{error.message}</p>}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {data.map((song, i) => (
                    <SongCard key={song.song_id} song={song} badge={`#${i + 1}`} />
                ))}
            </div>
        </div>
    )
}
