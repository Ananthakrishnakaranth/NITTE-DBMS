import { useMemo, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { useSearch } from '../hooks/useSongs'
import SongCard from '../components/SongCard'

export default function Search() {
    const [query, setQuery] = useState('')
    const normalized = useMemo(() => query.trim(), [query])
    const { data = [], isFetching } = useSearch(normalized)

    return (
        <div className="px-6 py-6">
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Search</h1>

            <div className="relative max-w-xl">
                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search songs, artists, albums"
                    className="w-full rounded-xl pl-9 pr-4 py-3 text-sm zen-input"
                />
            </div>

            {isFetching && <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>Searching...</p>}

            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {data.map((song) => <SongCard key={song.song_id} song={song} badge="Match" />)}
            </div>

            {normalized && !isFetching && data.length === 0 && (
                <p className="mt-8 text-sm" style={{ color: 'var(--color-muted)' }}>No results found.</p>
            )}
        </div>
    )
}
