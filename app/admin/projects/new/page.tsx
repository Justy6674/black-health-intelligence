import ProjectForm from '@/components/admin/ProjectForm'
import Link from 'next/link'

export default function NewProjectPage() {
    return (
        <div>
            <div className="mb-8">
                <Link href="/admin/projects" className="text-silver-400 hover:text-white transition-colors mb-4 inline-block">
                    ← Back to Projects
                </Link>
                <h1 className="heading-lg text-white mb-2">Add New Project</h1>
                <p className="text-silver-400">Create a new portfolio project</p>
            </div>

            <div className="card max-w-3xl">
                <ProjectForm mode="create" />
            </div>
        </div>
    )
}
