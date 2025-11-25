import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectForm from '@/components/admin/ProjectForm'
import Link from 'next/link'
import { Project } from '@/lib/types'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (!project) {
        notFound()
    }

    return (
        <div>
            <div className="mb-8">
                <Link href="/admin/projects" className="text-silver-400 hover:text-white transition-colors mb-4 inline-block">
                    ← Back to Projects
                </Link>
                <h1 className="heading-lg text-white mb-2">Edit Project</h1>
                <p className="text-silver-400">Update project details</p>
            </div>

            <div className="card max-w-3xl">
                <ProjectForm mode="edit" initialData={project as Project} />
            </div>
        </div>
    )
}
