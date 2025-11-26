'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Project, HighlightBadge, HighlightEffect, Tag } from '@/lib/types'
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

// Strip HTML tags for plain text display
const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
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

    const highlightBadges = project.highlight_badges || []
    const highlightEffect = project.highlight_effect || 'none'

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

                {/* Highlight Badges */}
                {highlightBadges.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {highlightBadges.map((badge) => (
                            <span 
                                key={badge}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-widest uppercase border rounded-full ${getBadgeColor(badge)} ${getEffectClass(highlightEffect)}`}
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
                                {badge === 'New' && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {badge === 'Featured' && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                )}
                                {badge === 'Coming Soon' && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {badge}
                            </span>
                        ))}
                    </div>
                )}

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

                {/* Project Tags */}
                {project.tags && project.tags.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-1.5">
                        {project.tags.slice(0, 5).map((tag) => (
                            <span
                                key={tag.id}
                                className={`inline-flex items-center px-2 py-0.5 text-[9px] font-medium tracking-wide border rounded ${getTagColor(tag.category)}`}
                            >
                                {tag.name}
                            </span>
                        ))}
                        {project.tags.length > 5 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-medium text-silver-500">
                                +{project.tags.length - 5} more
                            </span>
                        )}
                    </div>
                )}

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

                {/* Click to View Details Indicator & Contact Button */}
                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
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
