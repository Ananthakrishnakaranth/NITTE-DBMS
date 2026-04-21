import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import useAuthStore from '../store/useAuthStore'

export default function Auth({ initialTab = 'login' }) {
    const [tab, setTab] = useState(initialTab)
    const [form, setForm] = useState({ username: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const user = useAuthStore((s) => s.user)
    const setUser = useAuthStore((s) => s.setUser)

    if (user) return <Navigate to="/home" replace />

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const endpoint = tab === 'register' ? '/api/register' : '/api/login'
            const payload = tab === 'register'
                ? { username: form.username.trim(), email: form.email.trim(), password: form.password }
                : { email: form.email.trim(), password: form.password }

            const res = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const contentType = res.headers.get('content-type') || ''
            const data = contentType.includes('application/json')
                ? await res.json()
                : { error: await res.text() }
            if (!res.ok) throw new Error(data.error || 'Authentication failed')
            setUser(data.user)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid place-items-center px-4" style={{ background: 'radial-gradient(circle at 14% 8%, rgba(140,176,255,0.3) 0%, rgba(140,176,255,0) 36%), radial-gradient(circle at 82% 22%, rgba(161,206,246,0.32) 0%, rgba(161,206,246,0) 34%), linear-gradient(160deg, #ecf2f9 0%, #e4ecf8 100%)' }}>
            <Motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md rounded-3xl p-8"
                style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-glow)', border: '1px solid var(--color-border)', backdropFilter: 'blur(16px)' }}
            >
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>MuseStream</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Mood-based music with smart recommendations.</p>

                <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl p-1" style={{ background: 'rgba(232,241,255,0.78)' }}>
                    <button
                        onClick={() => setTab('login')}
                        className="rounded-lg py-2 text-sm font-semibold"
                        style={{ background: tab === 'login' ? 'rgba(255,255,255,0.95)' : 'transparent', color: tab === 'login' ? 'var(--color-accent)' : 'var(--color-muted)' }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setTab('register')}
                        className="rounded-lg py-2 text-sm font-semibold"
                        style={{ background: tab === 'register' ? 'rgba(255,255,255,0.95)' : 'transparent', color: tab === 'register' ? 'var(--color-accent)' : 'var(--color-muted)' }}
                    >
                        Register
                    </button>
                </div>

                <form className="mt-6 space-y-4" onSubmit={submit}>
                    {tab === 'register' && (
                        <div className="floating-label-group">
                            <input
                                placeholder=" "
                                value={form.username}
                                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                required
                            />
                            <label>Username</label>
                        </div>
                    )}

                    <div className="floating-label-group">
                        <input
                            type="email"
                            placeholder=" "
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            required
                        />
                        <label>Email</label>
                    </div>

                    <div className="floating-label-group">
                        <input
                            type="password"
                            placeholder=" "
                            value={form.password}
                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                            required
                        />
                        <label>Password</label>
                    </div>

                    {error && <p className="text-sm" style={{ color: '#d64f70' }}>{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl py-3 text-sm font-semibold zen-button"
                        style={{ background: 'var(--color-accent)', color: 'white', opacity: loading ? 0.75 : 1 }}
                    >
                        {loading ? 'Please wait...' : tab === 'register' ? 'Create account' : 'Continue'}
                    </button>
                </form>
            </Motion.div>
        </div>
    )
}
