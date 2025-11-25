'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const [supabase] = useState(() => {
        if (typeof window === 'undefined') return null
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    })

    const handleLogout = async () => {
        if (!supabase) return
        await supabase.auth.signOut()
        router.push('/admin/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-deep-black">
            {/* Admin header */}
            <header className="bg-charcoal border-b border-silver-700/30">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gradient">Black Health Intelligence</h1>
                        <p className="text-sm text-silver-500">Admin Dashboard</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary text-sm"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </div>
        </div>
    )
}
