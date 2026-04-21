import { useQuery } from '@tanstack/react-query'

const fetchHistory = async () => {
    const res = await fetch('/api/history', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch listening history')
    return res.json()
}

const fmtDate = (iso) => {
    if (!iso) return 'Unknown'
    const date = new Date(iso)
    return date.toLocaleString()
}

export default function History() {
    const { data = [], isLoading, error } = useQuery({ queryKey: ['history'], queryFn: fetchHistory })

    return (
        <div className="px-6 py-6">
            <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--color-text)' }}>Listening History</h1>

            {isLoading && <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading history...</p>}
            {error && <p className="text-sm" style={{ color: '#d64f70' }}>{error.message}</p>}

            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-soft)', backdropFilter: 'blur(10px)' }}>
                <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold" style={{ background: 'rgba(231, 241, 255, 0.8)', color: 'var(--color-muted)' }}>
                    <span className="col-span-5">Track</span>
                    <span className="col-span-3">Artist</span>
                    <span className="col-span-2">Duration</span>
                    <span className="col-span-2">Played</span>
                </div>

                {data.length === 0 && !isLoading ? (
                    <p className="p-5 text-sm" style={{ color: 'var(--color-muted)' }}>No listening history yet.</p>
                ) : (
                    data.map((row) => (
                        <div key={row.history_id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-t" style={{ borderColor: 'rgba(205, 220, 240, 0.7)' }}>
                            <span className="col-span-5 truncate" style={{ color: 'var(--color-text)' }}>{row.title}</span>
                            <span className="col-span-3 truncate" style={{ color: 'var(--color-muted)' }}>{row.artist}</span>
                            <span className="col-span-2" style={{ color: 'var(--color-muted)' }}>{Math.round((row.listen_duration_seconds || 0) / 60)} min</span>
                            <span className="col-span-2 truncate" style={{ color: 'var(--color-muted)' }}>{fmtDate(row.listened_at)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
