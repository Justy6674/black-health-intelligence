'use client'

import { useState, useEffect } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import Link from 'next/link'
import { Project } from '@/lib/types'
import DeleteProjectButton from '@/components/admin/DeleteProjectButton'
import { updateProjectOrder } from '@/app/admin/actions'

interface ProjectListProps {
    initialProjects: Project[]
}

// Helper to get display category name
function getCategoryDisplay(project: Project): string {
    if (project.category === 'clinical') return '🏥 Clinical'
    if (project.category === 'partner-solutions') return '🤝 Partner'
    if (project.category === 'health-saas') {
        if (project.subcategory === 'health-saas') return '💊 Health SaaS'
        if (project.subcategory === 'non-health-saas') return '🚀 Non-Health SaaS'
        return '⚠️ Health SaaS (no sub)'
    }
    return '📦 Other'
}

// Helper to get section key for grouping
function getSectionKey(project: Project): string {
    if (project.category === 'clinical') return 'clinical'
    if (project.category === 'partner-solutions') return 'partner'
    if (project.category === 'health-saas' && project.subcategory === 'health-saas') return 'health-saas'
    if (project.category === 'health-saas' && project.subcategory === 'non-health-saas') return 'non-health-saas'
    return 'other'
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
    const [projects, setProjects] = useState(initialProjects)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Update local state when props change (e.g. after a delete/revalidate)
    useEffect(() => {
        setProjects(initialProjects)
    }, [initialProjects])

    const handleReorder = (newOrder: Project[]) => {
        setProjects(newOrder)
        setHasChanges(true)
    }

    const saveOrder = async () => {
        setIsSaving(true)
        try {
            // Map the new order to display_order values (0-indexed based on position)
            const updates = projects.map((project, index) => ({
                id: project.id,
                display_order: index
            }))
            
            await updateProjectOrder(updates)
            setHasChanges(false)
        } catch (error) {
            console.error('Failed to save order:', error)
            alert('Failed to save order. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    // Group projects by section and calculate position within each section
    const projectPositions = new Map<string, number>()
    const sectionCounts = new Map<string, number>()
    
    // First pass: count projects per section
    projects.forEach(project => {
        const section = getSectionKey(project)
        sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1)
    })
    
    // Second pass: assign positions within each section
    const sectionCurrentPos = new Map<string, number>()
    projects.forEach(project => {
        const section = getSectionKey(project)
        const pos = (sectionCurrentPos.get(section) || 0) + 1
        sectionCurrentPos.set(section, pos)
        projectPositions.set(project.id, pos)
    })

    return (
        <div className="space-y-6">
            {hasChanges && (
                <div className="bg-slate-blue/20 border border-slate-blue/50 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-blue-200 text-sm">
                        Order changed. Don&apos;t forget to save.
                    </p>
                    <button
                        onClick={saveOrder}
                        disabled={isSaving}
                        className="px-4 py-2 bg-slate-blue text-white rounded text-sm font-medium hover:bg-slate-blue/80 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save New Order'}
                    </button>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="bg-charcoal/50 border-b border-silver-700/30 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-silver-400 uppercase tracking-wider">
                    <div className="col-span-1">Order</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Category</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Actions</div>
                </div>

                <Reorder.Group axis="y" values={projects} onReorder={handleReorder} className="divide-y divide-silver-700/30">
                    {projects.map((project) => (
                        <ProjectItem 
                            key={project.id} 
                            project={project} 
                            position={projectPositions.get(project.id) || 0}
                            totalInSection={sectionCounts.get(getSectionKey(project)) || 0}
                        />
                    ))}
                </Reorder.Group>
                
                {projects.length === 0 && (
                    <div className="p-8 text-center text-silver-400">
                        No projects found.
                    </div>
                )}
            </div>
        </div>
    )
}

function ProjectItem({ project, position, totalInSection }: { project: Project; position: number; totalInSection: number }) {
    const controls = useDragControls()
    const categoryDisplay = getCategoryDisplay(project)
    const hasSubcategoryIssue = project.category === 'health-saas' && !project.subcategory

    return (
        <Reorder.Item
            value={project}
            dragListener={false}
            dragControls={controls}
            className={`bg-charcoal hover:bg-charcoal/50 transition-colors ${hasSubcategoryIssue ? 'border-l-4 border-yellow-500' : ''}`}
        >
            <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1 flex items-center gap-3 cursor-grab active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
                     <svg className="w-5 h-5 text-silver-600 hover:text-silver-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                    <span className="text-sm text-white font-medium">{position}<span className="text-silver-600">/{totalInSection}</span></span>
                </div>
                <div className="col-span-4 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{project.name}</div>
                    <div className="text-sm text-silver-400 truncate">
                        {project.short_description}
                    </div>
                </div>
                <div className="col-span-3">
                    <span className={`text-sm ${hasSubcategoryIssue ? 'text-yellow-400' : 'text-silver-300'}`}>
                        {categoryDisplay}
                    </span>
                    {hasSubcategoryIssue && (
                        <div className="text-xs text-yellow-500 mt-0.5">⚠️ Won&apos;t show - needs edit</div>
                    )}
                </div>
                <div className="col-span-2">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        project.status === 'development' ? 'bg-blue-500/20 text-blue-400' :
                        project.status === 'coming-soon' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                    }`}>
                        {project.status.replace('-', ' ')}
                    </span>
                </div>
                <div className="col-span-2 flex items-center gap-3 text-sm">
                    <Link
                        href={`/admin/projects/${project.id}/edit`}
                        className="text-[var(--electric-blue)] hover:text-white transition-colors"
                    >
                        Edit
                    </Link>
                    <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </div>
            </div>
        </Reorder.Item>
    )
}

