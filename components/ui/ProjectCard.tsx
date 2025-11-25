'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Project } from '@/lib/types'

interface ProjectCardProps {
    project: Project
    index: number
}

const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    development: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'coming-soon': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group"
        >
            <div className="card card-hover h-full flex flex-col">
                {/* Logo */}
                {project.logo_url && (
                    <div className="mb-4 relative h-20 w-20 rounded-lg overflow-hidden bg-charcoal/50 flex items-center justify-center">
                        <Image
                            src={project.logo_url}
                            alt={`${project.name} logo`}
                            width={80}
                            height={80}
                            className="object-contain"
                        />
                    </div>
                )}

                {/* Status badge */}
                <div className="mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                    </span>
                </div>

                {/* Project name */}
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-gradient transition-all">
                    {project.name}
                </h3>

                {/* Description */}
                <p className="text-silver-400 mb-6 flex-grow leading-relaxed">
                    {project.short_description}
                </p>

                {/* Link button */}
                {project.website_url && (
                    <a
                        href={project.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-metallic hover:text-white transition-colors group/link"
                    >
                        <span className="font-medium">Visit Website</span>
                        <svg
                            className="w-4 h-4 transition-transform group-hover/link:translate-x-1"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                        </svg>
                    </a>
                )}
            </div>
        </motion.div>
    )
}
