import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import useAuthStore from '../store/useAuthStore'

const loadOptions = async () => {
    const res = await fetch('/api/onboarding-options', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch onboarding options')
    return res.json()
}

export default function Onboard() {
    const user = useAuthStore((s) => s.user)
    const setUser = useAuthStore((s) => s.setUser)

    const [genres, setGenres] = useState([])
    const [artists, setArtists] = useState([])
    const [error, setError] = useState('')

    const { data, isLoading } = useQuery({ queryKey: ['onboarding-options'], queryFn: loadOptions })

    const selectedCount = genres.length + artists.length
    const canSubmit = selectedCount >= 3

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/onboard', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genres, artists }),
            })
            const payload = await res.json()
            if (!res.ok) throw new Error(payload.error || 'Failed to save onboarding')
            return payload
        },
        onSuccess: () => {
            if (user) setUser({ ...user, onboarding_complete: true })
        },
        onError: (err) => setError(err.message),
    })

    const chips = useMemo(() => ({ genres: data?.genres || [], artists: data?.artists || [] }), [data])

    if (!user) return <Navigate to="/login" replace />
    if (user?.onboarding_complete) return <Navigate to="/home" replace />

    const toggle = (kind, value) => {
        const setter = kind === 'genre' ? setGenres : setArtists
        setter((current) => current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
    }

    return (
        <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(160deg, var(--color-bg) 0%, var(--color-bg-deep) 100%)' }}>
            <div className="max-w-4xl mx-auto">
                <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-glow)', backdropFilter: 'blur(12px)' }}>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Tune your feed</h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>Pick at least 3 genres or artists to personalize recommendations.</p>

                    {isLoading ? (
                        <p className="mt-6 text-sm" style={{ color: 'var(--color-muted)' }}>Loading options...</p>
                    ) : (
                        <>
                            <section className="mt-8">
                                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Genres</h2>
                                <div className="flex flex-wrap gap-2">
                                    {chips.genres.map((g) => {
                                        const active = genres.includes(g)
                                        return (
                                            <button
                                                key={g}
                                                onClick={() => toggle('genre', g)}
                                                className="px-3 py-1.5 rounded-full text-sm"
                                                style={{
                                                    background: active ? 'var(--color-accent)' : 'rgba(232, 241, 255, 0.84)',
                                                    color: active ? 'white' : 'var(--color-text)',
                                                }}
                                            >
                                                {g}
                                            </button>
                                        )
                                    })}
                                </div>
                            </section>

                            <section className="mt-7">
                                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Artists</h2>
                                <div className="flex flex-wrap gap-2">
                                    {chips.artists.map((a) => {
                                        const active = artists.includes(a)
                                        return (
                                            <button
                                                key={a}
                                                onClick={() => toggle('artist', a)}
                                                className="px-3 py-1.5 rounded-full text-sm"
                                                style={{
                                                    background: active ? 'var(--color-accent)' : 'rgba(232, 241, 255, 0.84)',
                                                    color: active ? 'white' : 'var(--color-text)',
                                                }}
                                            >
                                                {a}
                                            </button>
                                        )
                                    })}
                                </div>
                            </section>
                        </>
                    )}

                    <div className="mt-8 flex items-center justify-between">
                        <p className="text-sm" style={{ color: canSubmit ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                            Selected: {selectedCount}
                        </p>
                        <button
                            onClick={() => mutation.mutate()}
                            disabled={!canSubmit || mutation.isPending}
                            className="rounded-xl px-6 py-2.5 text-sm font-semibold zen-button"
                            style={{ background: 'var(--color-accent)', color: 'white', opacity: !canSubmit || mutation.isPending ? 0.65 : 1 }}
                        >
                            {mutation.isPending ? 'Saving...' : 'Finish onboarding'}
                        </button>
                    </div>

                    {error && <p className="mt-3 text-sm" style={{ color: '#d64f70' }}>{error}</p>}
                </Motion.div>
            </div>
        </div>
    )
}
