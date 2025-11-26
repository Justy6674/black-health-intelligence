'use client'

import { useState } from 'react'
import { Project, HighlightBadge, HighlightEffect, BadgeColor, CustomBadge } from '@/lib/types'
import ProjectCard from '@/components/ui/ProjectCard'
import ProjectDetailModal from '@/components/ui/ProjectDetailModal'
import Image from 'next/image'

// Legacy badge colours
const getLegacyBadgeColor = (badge: HighlightBadge) => {
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

// Custom badge colour classes
const getCustomBadgeColor = (color: BadgeColor): string => {
    const colorMap: Record<BadgeColor, string> = {
        yellow: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50',
        gold: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
        green: 'bg-green-500/30 text-green-300 border-green-500/50',
        blue: 'bg-blue-500/30 text-blue-300 border-blue-500/50',
        purple: 'bg-purple-500/30 text-purple-300 border-purple-500/50',
        pink: 'bg-pink-500/30 text-pink-300 border-pink-500/50',
        orange: 'bg-orange-500/30 text-orange-300 border-orange-500/50',
        cyan: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50',
        red: 'bg-red-500/30 text-red-300 border-red-500/50',
        white: 'bg-white/20 text-white border-white/50',
    }
    return colorMap[color] || colorMap.white
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
                                        {/* Custom Badges (new system - takes priority) */}
                                        {clinicalProject.custom_badges && clinicalProject.custom_badges.length > 0 && (
                                            <div className="mb-4 flex flex-wrap justify-center md:justify-start gap-2">
                                                {clinicalProject.custom_badges.map((badge) => (
                                                    <span 
                                                        key={badge.id}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-widest uppercase border rounded-full ${getCustomBadgeColor(badge.color)} ${getEffectClass(badge.effect)}`}
                                                    >
                                                        {badge.text}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Legacy Highlight Badges (backwards compatibility) */}
                                        {(!clinicalProject.custom_badges || clinicalProject.custom_badges.length === 0) && clinicalProject.highlight_badges && clinicalProject.highlight_badges.length > 0 && (
                                            <div className="mb-4 flex flex-wrap justify-center md:justify-start gap-2">
                                                {clinicalProject.highlight_badges.map((badge) => (
                                                    <span 
                                                        key={badge}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-widest uppercase border rounded-full ${getLegacyBadgeColor(badge)} ${getEffectClass(clinicalProject.highlight_effect || 'none')}`}
                                                    >
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


