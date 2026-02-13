import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
    const supabase = await createClient()

    // Fetch project stats
    const { data: projects } = await supabase
        .from('projects')
        .select('*')

    const allProjects = projects || []
    const activeProjects = allProjects.filter(p => p.status === 'active')
    const inDevelopment = allProjects.filter(p => p.status === 'development')

    return (
        <div>
            <div className="mb-8">
                <h1 className="heading-lg text-white mb-2">Dashboard</h1>
                <p className="text-silver-400">Manage your portfolio projects</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card">
                    <div className="text-silver-400 text-sm mb-1">Total Projects</div>
                    <div className="text-3xl font-bold text-white">{allProjects.length}</div>
                </div>
                <div className="card">
                    <div className="text-silver-400 text-sm mb-1">Active</div>
                    <div className="text-3xl font-bold text-green-400">{activeProjects.length}</div>
                </div>
                <div className="card">
                    <div className="text-silver-400 text-sm mb-1">In Development</div>
                    <div className="text-3xl font-bold text-blue-400">{inDevelopment.length}</div>
                </div>
            </div>

            {/* Quick actions */}
            <div className="card">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                    <Link href="/admin/projects" className="block">
                        <div className="p-4 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-silver-700/30">
                            <h3 className="font-semibold text-white mb-1">Manage Projects</h3>
                            <p className="text-sm text-silver-400">View, edit, and organize your portfolio projects</p>
                        </div>
                    </Link>
                    <Link href="/admin/projects/new" className="block">
                        <div className="p-4 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-silver-700/30">
                            <h3 className="font-semibold text-white mb-1">Add New Project</h3>
                            <p className="text-sm text-silver-400">Create a new portfolio project</p>
                        </div>
                    </Link>
                    <Link href="/admin/solutions" className="block">
                        <div className="p-4 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-silver-700/30">
                            <h3 className="font-semibold text-white mb-1">Edit Solutions Page</h3>
                            <p className="text-sm text-silver-400">Manage content for the Solutions/About page</p>
                        </div>
                    </Link>
                    <Link href="/" className="block">
                        <div className="p-4 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-silver-700/30">
                            <h3 className="font-semibold text-white mb-1">View Public Site</h3>
                            <p className="text-sm text-silver-400">See how your portfolio looks to visitors</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Xero Tools */}
            <div className="card mt-8">
                <h2 className="text-xl font-bold text-white mb-2">Xero Tools</h2>
                <p className="text-sm text-silver-500 mb-4">Internal Halaxy → Xero repair &amp; reconciliation</p>
                <div className="space-y-3">
                    <Link href="/admin/xero/bulk-void" className="block">
                        <div className="p-4 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-red-700/30">
                            <h3 className="font-semibold text-white mb-1">🗑️ Bulk Void Invoices</h3>
                            <p className="text-sm text-silver-400">Upload a Xero CSV and void incorrect Halaxy invoices in bulk</p>
                        </div>
                    </Link>
                    <Link href="/admin/xero/clearing-helper" className="block">
                        <div className="p-4 bg-charcoal/50 rounded-lg hover:bg-charcoal transition-colors border border-blue-700/30">
                            <h3 className="font-semibold text-white mb-1">🏦 Clearing Account Reconciliation</h3>
                            <p className="text-sm text-silver-400">Match NAB deposits to Halaxy clearing-account payments for fast bank rec</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
