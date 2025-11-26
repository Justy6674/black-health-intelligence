'use client'

import { useState } from 'react'
import { Project, HighlightEffect, BadgeColor } from '@/lib/types'
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

// Reusable full-width project card component
function FullWidthProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="cursor-pointer group"
        >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 hover:border-white/20 hover:bg-white/10 transition-all duration-300 backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {project.logo_url ? (
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-4 group-hover:scale-105 transition-transform flex-shrink-0">
                            <Image
                                src={project.logo_url}
                                alt={`${project.name} logo`}
                                width={128}
                                height={128}
                                className="object-contain"
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-4 group-hover:scale-105 transition-transform flex-shrink-0">
                            <span className="text-4xl font-bold text-white/20">{project.name.charAt(0)}</span>
                        </div>
                    )}
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="heading-chrome text-2xl md:text-3xl font-bold mb-4">{project.name}</h3>
                        <p className="text-white/70 text-base md:text-lg leading-relaxed">{project.short_description}</p>
                    </div>
                </div>
                
                {/* Custom Badges - Bottom Right of Card */}
                {project.custom_badges && project.custom_badges.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap justify-end gap-2">
                        {project.custom_badges.map((badge) => (
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
    )
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
                    <section className="mb-20">
                        <h2 className="heading-chrome text-4xl md:text-5xl lg:text-6xl mb-10 tracking-tight">Clinical Site</h2>
                        <FullWidthProjectCard project={clinicalProject} onClick={() => handleCardClick(clinicalProject)} />
                    </section>
                )}

                {/* Health-Related SaaS Section */}
                {healthSaasProjects.length > 0 && (
                    <section className="mb-20">
                        <h2 className="heading-chrome text-4xl md:text-5xl lg:text-6xl mb-10 tracking-tight">Health-Related SaaS</h2>
                        <div className="space-y-6">
                            {healthSaasProjects.map((project) => (
                                <FullWidthProjectCard 
                                    key={project.id} 
                                    project={project} 
                                    onClick={() => handleCardClick(project)} 
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Non-Health-Related SaaS Section */}
                {nonHealthSaasProjects.length > 0 && (
                    <section className="mb-20">
                        <h2 className="heading-chrome text-4xl md:text-5xl lg:text-6xl mb-10 tracking-tight">Non-Health-Related SaaS</h2>
                        <div className="space-y-6">
                            {nonHealthSaasProjects.map((project) => (
                                <FullWidthProjectCard 
                                    key={project.id} 
                                    project={project} 
                                    onClick={() => handleCardClick(project)} 
                                />
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


