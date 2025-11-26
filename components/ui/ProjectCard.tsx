'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Project } from '@/lib/types'

interface ProjectCardProps {
    project: Project
    index: number
    variant?: 'standard' | 'industrial' | 'artistic'
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

export default function ProjectCard({ project, index, variant = 'standard' }: ProjectCardProps) {
    // Styles based on variant
    const containerStyles = {
        standard: "rounded-none border border-white/10 bg-white/5 backdrop-blur-md hover:border-[var(--electric-blue)]/40 hover:shadow-[0_0_40px_rgba(14,165,233,0.15)]",
        industrial: "rounded-none border border-blue-500/20 bg-black/40 backdrop-blur-sm hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] hover:bg-blue-900/10",
        artistic: "rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-xl hover:border-white/20 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:-translate-y-2"
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group h-full"
        >
            <div
                className={`h-full flex flex-col p-8 transition-all duration-500 relative overflow-hidden ${containerStyles[variant]}`}
            >
                {/* Variant-specific decorations */}
                {variant === 'industrial' && (
                    <>
                        <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-blue-500/50" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-blue-500/50" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-blue-500/50" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-blue-500/50" />
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_1px,transparent_1px)] bg-[size:40px_40px] opacity-10 pointer-events-none" />
                    </>
                )}
                
                {variant === 'artistic' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}

                {/* Standard Metallic sheen */}
                {variant === 'standard' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}

                {/* Logo Area */}
                {project.logo_url ? (
                    <div className={`mb-6 relative h-16 w-16 flex items-center justify-center border transition-colors 
                        ${variant === 'artistic' ? 'rounded-xl bg-white/5 border-white/10' : 'rounded-none bg-transparent border-white/10'}
                    `}>
                        <Image
                            src={project.logo_url}
                            alt={`${project.name} logo`}
                            width={64}
                            height={64}
                            className="object-contain p-2"
                        />
                    </div>
                ) : (
                    <div className={`mb-6 h-16 w-16 flex items-center justify-center border 
                        ${variant === 'artistic' ? 'rounded-xl bg-white/5 border-white/10' : 'rounded-none bg-transparent border-white/10'}
                    `}>
                         <span className="text-2xl font-bold text-white/20">{project.name.charAt(0)}</span>
                    </div>
                )}

                {/* Status & For Sale Badge */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-widest uppercase border ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                    </span>
                    {project.for_sale && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest uppercase border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            For Sale
                        </span>
                    )}
                </div>

                {/* Project name */}
                <h3 className={`text-2xl font-bold mb-4 text-white transition-colors
                    ${variant === 'industrial' ? 'font-mono tracking-tight group-hover:text-blue-400' : ''}
                    ${variant === 'artistic' ? 'group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-200 group-hover:bg-clip-text group-hover:text-transparent' : ''}
                    ${variant === 'standard' ? 'group-hover:text-[var(--electric-blue)]' : ''}
                `}>
                    {project.name}
                </h3>

                {/* Description */}
                <p className={`mb-8 flex-grow leading-relaxed text-sm
                    ${variant === 'industrial' ? 'text-blue-200/60 font-mono text-xs' : 'text-silver-400 font-light'}
                `}>
                    {project.short_description}
                </p>

                {/* Action Button */}
                {project.website_url && (
                    <div className="mt-auto mb-4">
                        <div className={`inline-flex items-center gap-3 text-xs font-bold tracking-[0.2em] uppercase transition-colors group/link
                            ${variant === 'industrial' ? 'text-blue-400 hover:text-white' : 'text-white hover:text-[var(--electric-blue)]'}
                        `}>
                            <span>{variant === 'industrial' ? '> ACCESS_SYSTEM' : 'Visit Platform'}</span>
                            <svg
                                className="w-4 h-4 transition-transform group-hover/link:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                            </svg>
                        </div>
                    </div>
                )}

                {/* Click to View Details Indicator */}
                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-silver-500 group-hover:text-silver-300 transition-colors">
                        Click for details
                    </span>
                    <svg 
                        className="w-4 h-4 text-silver-500 group-hover:text-white group-hover:translate-x-1 transition-all" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </motion.div>
    )
}
