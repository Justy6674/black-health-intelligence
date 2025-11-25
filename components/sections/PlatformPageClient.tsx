'use client'

import { useState } from 'react'
import { Project } from '@/lib/types'
import ProjectCard from '@/components/ui/ProjectCard'
import ProjectDetailModal from '@/components/ui/ProjectDetailModal'
import Image from 'next/image'

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


