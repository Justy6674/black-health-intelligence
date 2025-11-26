'use client'

import { useState } from 'react'
import { Project, HighlightEffect, BadgeColor } from '@/lib/types'
import ProjectCard from '@/components/ui/ProjectCard'
import ProjectDetailModal from '@/components/ui/ProjectDetailModal'
import Image from 'next/image'

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
                                        <h3 className="text-3xl font-bold text-white mb-4">{clinicalProject.name}</h3>
                                        <p className="text-white/70 text-lg leading-relaxed">{clinicalProject.short_description}</p>
                                    </div>
                                </div>
                                
                                {/* Custom Badges - Bottom Right of Card */}
                                {clinicalProject.custom_badges && clinicalProject.custom_badges.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap justify-end gap-2">
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


