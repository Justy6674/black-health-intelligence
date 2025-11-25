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
                <Link href="/admin/projects/new" className="btn-primary">
                    Add New Project
                </Link>
            </div>

            <ProjectList initialProjects={allProjects} />
        </div>
    )
}
