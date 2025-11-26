'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Project, Tag, TagCategory } from '@/lib/types'
import { X } from 'lucide-react'
import EnquiryModal from '@/components/modals/EnquiryModal'
import { createBrowserClient } from '@supabase/ssr'

interface ProjectDetailModalProps {
    project: Project | null
    isOpen: boolean
    onClose: () => void
}

const categoryLabels: Record<TagCategory, string> = {
    tech_stack: 'Tech Stack',
    build_phase: 'Build Phase',
    business_model: 'Business Model',
    project_type: 'Project Type',
}

const categoryColors: Record<TagCategory, string> = {
    tech_stack: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    build_phase: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    business_model: 'bg-green-500/20 text-green-400 border-green-500/30',
    project_type: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export default function ProjectDetailModal({ project, isOpen, onClose }: ProjectDetailModalProps) {
    const [enquiryOpen, setEnquiryOpen] = useState(false)
    const [tags, setTags] = useState<Tag[]>([])
    
    const [supabase] = useState(() => {
        if (typeof window === 'undefined') return null
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    })

    useEffect(() => {
        if (!supabase || !project?.id || !isOpen) return
        
        const fetchTags = async () => {
            const { data } = await supabase
                .from('project_tags')
                .select('tag_id, tags(*)')
                .eq('project_id', project.id)
            
            if (data) {
                const projectTags = data.map((pt: any) => pt.tags).filter(Boolean)
                setTags(projectTags)
            }
        }
        
        fetchTags()
    }, [supabase, project?.id, isOpen])

    // Group tags by category
    const tagsByCategory = tags.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = []
        acc[tag.category].push(tag)
        return acc
    }, {} as Record<TagCategory, Tag[]>)
    
    if (!project) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-4 md:inset-8 lg:inset-16 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-y-auto z-50"
                    >
                        <div className="relative p-8 md:p-12">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Hero Section */}
                            <div className="mb-12 flex flex-col md:flex-row items-start gap-8 pb-8 border-b border-white/10">
                                {project.logo_url && (
                                    <div className="w-32 h-32 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-4">
                                        <Image
                                            src={project.logo_url}
                                            alt={`${project.name} logo`}
                                            width={128}
                                            height={128}
                                            className="object-contain"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{project.name}</h1>
                                    <p className="text-xl text-white/70 leading-relaxed">{project.short_description}</p>
                                </div>
                            </div>

                            {/* Project Tags */}
                            {tags.length > 0 && (
                                <div className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
                                    <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-4">Project Tags</h3>
                                    <div className="space-y-3">
                                        {(Object.keys(tagsByCategory) as TagCategory[]).map(category => (
                                            <div key={category} className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs text-white/40 w-24 shrink-0">{categoryLabels[category]}:</span>
                                                {tagsByCategory[category].map(tag => (
                                                    <span 
                                                        key={tag.id}
                                                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${categoryColors[category]}`}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Problem It Solves - Full Width */}
                            {project.problem_solves && (
                                <div className="mb-8 bg-white/5 border border-white/10 rounded-lg p-6">
                                    <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Problem It Solves</h3>
                                    <div 
                                        className="text-white/90 leading-relaxed prose prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-white"
                                        dangerouslySetInnerHTML={{ __html: project.problem_solves }}
                                    />
                                </div>
                            )}

                            {/* Quick Info Row - Compact inline items for simple data */}
                            {(project.estimated_release || project.revenue_stream || project.market_scope) && (
                                <div className="mb-6 flex flex-wrap gap-3">
                                    {project.estimated_release && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm">
                                            <span className="text-white/50">Release:</span>
                                            <span className="text-white font-medium">{new Date(project.estimated_release).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })}</span>
                                        </span>
                                    )}
                                    {project.revenue_stream && project.revenue_stream.length < 50 && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm">
                                            <span className="text-white/50">Revenue:</span>
                                            <span className="text-white font-medium" dangerouslySetInnerHTML={{ __html: project.revenue_stream }} />
                                        </span>
                                    )}
                                    {project.market_scope && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm">
                                            <span className="text-white/50">Market:</span>
                                            <span className="text-white font-medium">{project.market_scope}</span>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Detailed Content Sections - Only show if there's substantial content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {/* Target Audience - only if has content */}
                                {project.target_audience && project.target_audience.trim().length > 0 && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                        <h3 className="text-xs font-bold tracking-widest uppercase text-white/60 mb-2">Target Audience</h3>
                                        <div 
                                            className="text-white/90 text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1 [&_strong]:text-white"
                                            dangerouslySetInnerHTML={{ __html: project.target_audience }}
                                        />
                                    </div>
                                )}

                                {/* Build Details - only if has content */}
                                {project.build_details && project.build_details.trim().length > 0 && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                        <h3 className="text-xs font-bold tracking-widest uppercase text-white/60 mb-2">Build Details</h3>
                                        <div 
                                            className="text-white/90 leading-relaxed font-mono text-xs prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1 [&_strong]:text-white"
                                            dangerouslySetInnerHTML={{ __html: project.build_details }}
                                        />
                                    </div>
                                )}

                                {/* Revenue Stream - only show as tile if it's long content */}
                                {project.revenue_stream && project.revenue_stream.length >= 50 && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                        <h3 className="text-xs font-bold tracking-widest uppercase text-white/60 mb-2">Revenue Stream</h3>
                                        <div 
                                            className="text-white/90 text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1 [&_strong]:text-white"
                                            dangerouslySetInnerHTML={{ __html: project.revenue_stream }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Investment/Sale Section */}
                            {(project.for_sale || project.investment_opportunity) && (
                                <div className="bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-lg p-8 mb-8">
                                    <h3 className="text-xl font-bold text-white mb-6">Investment & Partnership Opportunities</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {project.for_sale && (
                                            <div>
                                                <p className="text-sm font-bold tracking-widest uppercase text-white/60 mb-2">Available for Purchase</p>
                                                {project.sale_price && (
                                                    <p className="text-3xl font-bold text-white">${project.sale_price.toLocaleString()}</p>
                                                )}
                                            </div>
                                        )}
                                        {project.investment_opportunity && (
                                            <div>
                                                <p className="text-sm font-bold tracking-widest uppercase text-white/60 mb-2">Seeking Investment</p>
                                                <p className="text-white/90">Open to partnerships and investment opportunities</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Long Description */}
                            {project.long_description && (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4">Overview</h3>
                                    <div 
                                        className="prose prose-invert max-w-none text-white/80 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_strong]:text-white"
                                        dangerouslySetInnerHTML={{ __html: project.long_description }}
                                    />
                                </div>
                            )}

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap gap-4 pt-8 border-t border-white/10">
                                {project.website_url && (
                                    <a
                                        href={project.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-[var(--electric-blue)] text-white rounded-lg font-medium hover:bg-[var(--electric-blue)]/80 transition-colors"
                                    >
                                        Visit Website
                                    </a>
                                )}
                                {project.for_sale && (
                                    <button
                                        onClick={() => setEnquiryOpen(true)}
                                        className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition-colors inline-flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                        Enquire About Purchase
                                    </button>
                                )}
                                {project.investment_opportunity && !project.for_sale && (
                                    <button
                                        onClick={() => setEnquiryOpen(true)}
                                        className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                                    >
                                        Discuss Investment
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Enquiry Modal */}
                    <EnquiryModal
                        open={enquiryOpen}
                        onClose={() => setEnquiryOpen(false)}
                        projectName={project.name}
                    />
                </>
            )}
        </AnimatePresence>
    )
}


