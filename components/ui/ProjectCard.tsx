'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Project, HighlightEffect, CustomBadge, BadgeColor } from '@/lib/types'
import EnquiryModal from '@/components/modals/EnquiryModal'

interface ProjectCardProps {
    project: Project
    index: number
    variant?: 'standard' | 'industrial' | 'artistic'
    onContactClick?: (e: React.MouseEvent) => void
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

// Strip HTML tags for plain text display
const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}


export default function ProjectCard({ project, index, variant = 'standard' }: ProjectCardProps) {
    const [enquiryOpen, setEnquiryOpen] = useState(false)
    
    // Styles based on variant
    const containerStyles = {
        standard: "rounded-none border border-white/10 bg-white/5 backdrop-blur-md hover:border-[var(--electric-blue)]/40 hover:shadow-[0_0_40px_rgba(14,165,233,0.15)]",
        industrial: "rounded-none border border-blue-500/20 bg-black/40 backdrop-blur-sm hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] hover:bg-blue-900/10",
        artistic: "rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-white/0 backdrop-blur-xl hover:border-white/20 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:-translate-y-2"
    }

    const handleContactClick = (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent card click
        setEnquiryOpen(true)
    }

    const customBadges = project.custom_badges || []

    return (
        <>
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

                {/* Status Badge */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-widest uppercase border ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                    </span>
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
                <p className={`mb-4 leading-relaxed text-sm
                    ${variant === 'industrial' ? 'text-blue-200/60 font-mono text-xs' : 'text-silver-400 font-light'}
                `}>
                    {stripHtml(project.short_description)}
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

                {/* Bottom section with badges and actions */}
                <div className="mt-auto pt-4 border-t border-white/10">
                    {/* Custom Badges - Bottom Right */}
                    {customBadges.length > 0 && (
                        <div className="mb-3 flex flex-wrap justify-end gap-2">
                            {customBadges.map((badge) => (
                                <span 
                                    key={badge.id}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest uppercase border rounded-full ${getCustomBadgeColor(badge.color)} ${getEffectClass(badge.effect)}`}
                                >
                                    {badge.text}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    {/* Click indicator and contact button */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-silver-500 group-hover:text-silver-300 transition-colors">
                            Click for details
                        </span>
                        <div className="flex items-center gap-3">
                            {project.show_contact_button && (
                                <button
                                    onClick={handleContactClick}
                                    className="p-2 rounded-full bg-white/5 border border-white/10 text-silver-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all"
                                    title="Contact / Enquire"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            )}
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
                </div>
            </div>

            {/* Enquiry Modal */}
            <EnquiryModal
                open={enquiryOpen}
                onClose={() => setEnquiryOpen(false)}
                projectName={project.name}
            />
        </motion.div>
        </>
    )
}
