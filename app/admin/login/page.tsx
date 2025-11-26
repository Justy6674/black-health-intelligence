'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [loginType, setLoginType] = useState<'admin' | 'partner' | null>(null)
    const router = useRouter()
    
    // Initialize Supabase client
    const [supabase] = useState(() => {
        if (typeof window === 'undefined') return null
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    })

    // Check session on mount
    useEffect(() => {
        if (!supabase) return

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.replace('/admin')
            }
        }
        checkSession()
    }, [router, supabase])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!supabase) return

        setError('')
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            router.push('/admin')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Failed to login')
        } finally {
            setLoading(false)
        }
    }

    // Login type selection screen
    if (loginType === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-deep-black px-4">
                <div className="w-full max-w-md">
                    {/* Back to site */}
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 text-silver-400 hover:text-white transition-colors mb-8"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to site
                    </Link>

                    <div className="card glass-effect p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2">Portal Access</h1>
                            <p className="text-silver-400 text-sm">Black Health Intelligence</p>
                        </div>

                        <div className="space-y-4">
                            {/* Admin Login */}
                            <button
                                onClick={() => setLoginType('admin')}
                                className="w-full p-6 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--electric-blue)]/20 border border-[var(--electric-blue)]/30 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-[var(--electric-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white group-hover:text-[var(--electric-blue)] transition-colors">Admin Login</h3>
                                        <p className="text-sm text-silver-400">Manage portfolio & settings</p>
                                    </div>
                                    <svg className="w-5 h-5 text-silver-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Partner Login - Parked */}
                            <div className="w-full p-6 rounded-xl border border-white/10 bg-white/[0.02] text-left opacity-60 cursor-not-allowed">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-silver-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-silver-400">Partner Login</h3>
                                        <p className="text-sm text-silver-500">Coming soon</p>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded bg-white/5 text-silver-500 uppercase tracking-wider">Soon</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Admin login form
    return (
        <div className="min-h-screen flex items-center justify-center bg-deep-black px-4">
            <div className="w-full max-w-md">
                {/* Back button */}
                <button 
                    onClick={() => setLoginType(null)}
                    className="inline-flex items-center gap-2 text-silver-400 hover:text-white transition-colors mb-8"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>

                <div className="card glass-effect p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 rounded-lg bg-[var(--electric-blue)]/20 border border-[var(--electric-blue)]/30 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-[var(--electric-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
                        <p className="text-silver-400 text-sm">Black Health Intelligence</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Login form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-silver-300 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent transition-all"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-silver-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-deep-black text-white">
                Loading...
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
