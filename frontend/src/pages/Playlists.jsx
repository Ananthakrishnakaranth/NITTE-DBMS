import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SongCard from '../components/SongCard'
import PlaylistCard from '../components/PlaylistCard'
import { useSongs } from '../hooks/useSongs'

const fetchPlaylists = async () => {
    const res = await fetch('/api/playlists', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch playlists')
    return res.json()
}

export default function Playlists() {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')

    const { data: songs = [] } = useSongs()
    const { data: playlists = [], isLoading, error } = useQuery({ queryKey: ['playlists'], queryFn: fetchPlaylists })

    const createPlaylist = useMutation({
        mutationFn: async (playlistName) => {
            const res = await fetch('/api/playlists', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playlistName }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create playlist')
            return data
        },
        onSuccess: () => {
            setName('')
            queryClient.invalidateQueries({ queryKey: ['playlists'] })
        },
    })

    const addSongMutation = useMutation({
        mutationFn: async ({ playlistId, songId }) => {
            const res = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ song_id: songId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to add song to playlist')
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playlists'] }),
    })

    const handleCreate = (e) => {
        e.preventDefault()
        const next = name.trim()
        if (!next) return
        createPlaylist.mutate(next)
    }

    return (
        <div className="px-6 py-6">
            <div className="flex items-end justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Playlists</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Create playlists and drag songs into them.</p>
                </div>

                <form onSubmit={handleCreate} className="flex gap-2">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="New playlist"
                        className="rounded-xl px-3 py-2 text-sm zen-input"
                    />
                    <button
                        className="rounded-xl px-4 py-2 text-sm font-medium zen-button"
                        style={{ background: 'var(--color-accent)', color: 'white', opacity: createPlaylist.isPending ? 0.7 : 1 }}
                        disabled={createPlaylist.isPending}
                    >
                        Create
                    </button>
                </form>
            </div>

            {isLoading && <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading playlists...</p>}
            {error && <p className="text-sm" style={{ color: '#d64f70' }}>{error.message}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <section className="lg:col-span-7">
                    <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Song Library</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {songs.map((song) => (
                            <SongCard key={song.song_id} song={song} badge="Drag" />
                        ))}
                    </div>
                </section>

                <section className="lg:col-span-5">
                    <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Your Playlists</h2>
                    <div className="space-y-3">
                        {playlists.length === 0 ? (
                            <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', boxShadow: 'var(--shadow-soft)' }}>
                                No playlists yet. Create one and start dragging songs.
                            </div>
                        ) : (
                            playlists.map((playlist) => (
                                <PlaylistCard
                                    key={playlist.playlist_id}
                                    playlist={playlist}
                                    onDropSong={(playlistId, songId) => addSongMutation.mutate({ playlistId, songId })}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
