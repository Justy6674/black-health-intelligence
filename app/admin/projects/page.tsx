import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Project } from '@/lib/types'
import ProjectList from '@/components/admin/ProjectList'

export const revalidate = 0

export default async function ProjectsPage() {
    const supabase = await createClient()

    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('display_order', { ascending: true })

    const allProjects = (projects || []) as Project[]

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="heading-lg text-white mb-2">Projects</h1>
                    <p className="text-silver-400">Manage your portfolio projects</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link 
                        href="/platform" 
                        target="_blank"
                        className="btn-secondary inline-flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview Live
                    </Link>
                    <Link href="/admin/projects/new" className="btn-primary">
                        Add New Project
                    </Link>
                </div>
            </div>

            <ProjectList initialProjects={allProjects} />
        </div>
    )
}
