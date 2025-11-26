'use client'

import { useState } from 'react'
import { Project, HighlightBadge, HighlightEffect } from '@/lib/types'
import ProjectCard from '@/components/ui/ProjectCard'
import ProjectDetailModal from '@/components/ui/ProjectDetailModal'
import Image from 'next/image'

// Badge colours
const getBadgeColor = (badge: HighlightBadge) => {
    switch (badge) {
        case 'For Sale': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
        case 'Seeking Partners': return 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        case 'Hiring': return 'bg-green-500/20 text-green-300 border-green-500/40'
        case 'Revenue Raising': return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        case 'New': return 'bg-pink-500/20 text-pink-300 border-pink-500/40'
        case 'Featured': return 'bg-orange-500/20 text-orange-300 border-orange-500/40'
        case 'Coming Soon': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
}

// Effect classes
const getEffectClass = (effect: HighlightEffect) => {
    switch (effect) {
        case 'glow': return 'shadow-[0_0_15px_currentColor]'
        case 'pulse': return 'animate-pulse'
        default: return ''
    }
}

// Tag colours by category
const getTagColor = (category: string) => {
    switch (category) {
        case 'tech_stack': return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
        case 'build_phase': return 'bg-green-500/15 text-green-300 border-green-500/30'
        case 'business_model': return 'bg-purple-500/15 text-purple-300 border-purple-500/30'
        case 'project_type': return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        default: return 'bg-gray-500/15 text-gray-300 border-gray-500/30'
    }
}

export default function PlatformPageClient({ 
    clinicalProject, 
    healthSaasProjects, 
    nonHealthSaasProjects 
}: { 
    clinicalProject: Project | null
    healthSaasProjects: Project[]
    nonHealthSaasProjects: Project[]
}) {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleCardClick = (project: Project) => {
        setSelectedProject(project)
        setIsModalOpen(true)
    }

    return (
        <>
            <div className="pt-32 pb-20 relative z-10 section-container">
                {/* Clinical Site Section */}
                {clinicalProject && (
                    <section className="mb-24">
                        <h2 className="heading-chrome text-3xl md:text-4xl mb-8">Clinical Site</h2>
                        <div 
                            onClick={() => handleCardClick(clinicalProject)}
                            className="cursor-pointer group"
                        >
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 hover:border-white/20 hover:bg-white/10 transition-all duration-300 backdrop-blur-md">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    {clinicalProject.logo_url && (
                                        <div className="w-32 h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-4 group-hover:scale-105 transition-transform">
                                            <Image
                                                src={clinicalProject.logo_url}
                                                alt={`${clinicalProject.name} logo`}
                                                width={128}
                                                height={128}
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 text-center md:text-left">
                                        {/* Highlight Badges */}
                                        {clinicalProject.highlight_badges && clinicalProject.highlight_badges.length > 0 && (
                                            <div className="mb-4 flex flex-wrap justify-center md:justify-start gap-2">
                                                {clinicalProject.highlight_badges.map((badge) => (
                                                    <span 
                                                        key={badge}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-widest uppercase border rounded-full ${getBadgeColor(badge)} ${getEffectClass(clinicalProject.highlight_effect || 'none')}`}
                                                    >
                                                        {badge === 'For Sale' && (
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                        {badge === 'Hiring' && (
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                            </svg>
                                                        )}
                                                        {badge === 'Seeking Partners' && (
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                                            </svg>
                                                        )}
                                                        {badge === 'Revenue Raising' && (
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                        {badge}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <h3 className="text-3xl font-bold text-white mb-4">{clinicalProject.name}</h3>
                                        <p className="text-white/70 text-lg leading-relaxed mb-4">{clinicalProject.short_description}</p>
                                        {/* Project Tags */}
                                        {clinicalProject.tags && clinicalProject.tags.length > 0 && (
                                            <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                                                {clinicalProject.tags.slice(0, 8).map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium tracking-wide border rounded ${getTagColor(tag.category)}`}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))}
                                                {clinicalProject.tags.length > 8 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-silver-500">
                                                        +{clinicalProject.tags.length - 8} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Health-Related SaaS Section */}
                {healthSaasProjects.length > 0 && (
                    <section className="mb-24">
                        <h2 className="heading-chrome text-3xl md:text-4xl mb-8">Health-Related SaaS</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {healthSaasProjects.map((project, index) => (
                                <div key={project.id} onClick={() => handleCardClick(project)} className="cursor-pointer">
                                    <ProjectCard 
                                        project={project} 
                                        index={index} 
                                        variant="artistic"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Non-Health-Related SaaS Section */}
                {nonHealthSaasProjects.length > 0 && (
                    <section className="mb-24">
                        <h2 className="heading-chrome text-3xl md:text-4xl mb-8">Non-Health-Related SaaS</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {nonHealthSaasProjects.map((project, index) => (
                                <div key={project.id} onClick={() => handleCardClick(project)} className="cursor-pointer">
                                    <ProjectCard 
                                        project={project} 
                                        index={index} 
                                        variant="artistic"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Project Detail Modal */}
            <ProjectDetailModal
                project={selectedProject}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedProject(null)
                }}
            />
        </>
    )
}


