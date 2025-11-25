'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Project } from '@/lib/types'

interface ProjectCardProps {
    project: Project
    index: number
}

const statusColors = {
    active: 'text-green-400 border-green-500/30 bg-green-500/10',
    development: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    'coming-soon': 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    archived: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
}

const statusLabels = {
    active: 'Active',
    development: 'In Development',
    'coming-soon': 'Coming Soon',
    archived: 'Archived',
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -10, scale: 1.02, transition: { duration: 0.3 } }}
            className="group h-full"
        >
            <div
                className="h-full flex flex-col p-8 rounded-none border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-500 group-hover:border-[var(--electric-blue)]/40 group-hover:shadow-[0_0_40px_rgba(14,165,233,0.15)] relative overflow-hidden"
            >
                {/* Metallic sheen effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Logo Area */}
                {project.logo_url ? (
                    <div className="mb-6 relative h-16 w-16 rounded bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-colors">
                        <Image
                            src={project.logo_url}
                            alt={`${project.name} logo`}
                            width={64}
                            height={64}
                            className="object-contain p-2"
                        />
                    </div>
                ) : (
                    <div className="mb-6 h-16 w-16 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                         <span className="text-2xl font-bold text-white/20">{project.name.charAt(0)}</span>
                    </div>
                )}

                {/* Status */}
                <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-widest uppercase border ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                    </span>
                </div>

                {/* Project name */}
                <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[var(--electric-blue)] transition-colors">
                    {project.name}
                </h3>

                {/* Description */}
                <p className="text-silver-400 mb-8 flex-grow leading-relaxed text-sm font-light">
                    {project.short_description}
                </p>

                {/* Action Button */}
                {project.website_url && (
                    <div className="mt-auto">
                        <a
                            href={project.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 text-xs font-bold tracking-[0.2em] uppercase text-white hover:text-[var(--electric-blue)] transition-colors group/link"
                        >
                            <span>Visit Platform</span>
                            <svg
                                className="w-4 h-4 transition-transform group-hover/link:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </a>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
