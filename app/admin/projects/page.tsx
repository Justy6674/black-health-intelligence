import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Project } from '@/lib/types'
import DeleteProjectButton from '@/components/admin/DeleteProjectButton'

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

            {allProjects.length === 0 ? (
                <div className="card text-center py-12">
                    <p className="text-silver-400 mb-4">No projects yet</p>
                    <Link href="/admin/projects/new" className="btn-primary inline-block">
                        Create Your First Project
                    </Link>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-charcoal/50 border-b border-silver-700/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-silver-400 uppercase tracking-wider">
                                        Order
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-silver-400 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-silver-400 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-silver-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-silver-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-silver-700/30">
                                {allProjects.map((project) => (
                                    <tr key={project.id} className="hover:bg-charcoal/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-silver-300">
                                            {project.display_order}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-white">{project.name}</div>
                                            <div className="text-sm text-silver-400 truncate max-w-xs">
                                                {project.short_description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-silver-300 capitalize">
                                            {project.category.replace('-', ' ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full ${project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                    project.status === 'development' ? 'bg-blue-500/20 text-blue-400' :
                                                        project.status === 'coming-soon' ? 'bg-purple-500/20 text-purple-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {project.status.replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/admin/projects/${project.id}/edit`}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                                >
                                                    Edit
                                                </Link>
                                                <DeleteProjectButton projectId={project.id} projectName={project.name} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
