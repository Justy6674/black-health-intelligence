'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
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
