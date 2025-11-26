'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Project } from '@/lib/types'
import { X } from 'lucide-react'
import EnquiryModal from '@/components/modals/EnquiryModal'

interface ProjectDetailModalProps {
    project: Project | null
    isOpen: boolean
    onClose: () => void
}

export default function ProjectDetailModal({ project, isOpen, onClose }: ProjectDetailModalProps) {
    const [enquiryOpen, setEnquiryOpen] = useState(false)
    
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

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                {/* Problem It Solves */}
                                {project.problem_solves && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Problem It Solves</h3>
                                        <p className="text-white/90 leading-relaxed">{project.problem_solves}</p>
                                    </div>
                                )}

                                {/* Target Audience */}
                                {project.target_audience && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Target Audience</h3>
                                        <p className="text-white/90 leading-relaxed">{project.target_audience}</p>
                                    </div>
                                )}

                                {/* Build Details */}
                                {project.build_details && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Build Details</h3>
                                        <p className="text-white/90 leading-relaxed font-mono text-sm">{project.build_details}</p>
                                    </div>
                                )}

                                {/* Development Phase */}
                                {project.development_phase && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Development Phase</h3>
                                        <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm font-medium uppercase">
                                            {project.development_phase}
                                        </span>
                                    </div>
                                )}

                                {/* Estimated Release */}
                                {project.estimated_release && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Estimated Release</h3>
                                        <p className="text-white/90 text-lg font-semibold">{new Date(project.estimated_release).toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })}</p>
                                    </div>
                                )}

                                {/* Revenue Stream */}
                                {project.revenue_stream && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Revenue Stream</h3>
                                        <p className="text-white/90 leading-relaxed">{project.revenue_stream}</p>
                                    </div>
                                )}

                                {/* Market Scope */}
                                {project.market_scope && (
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                        <h3 className="text-sm font-bold tracking-widest uppercase text-white/60 mb-3">Market Scope</h3>
                                        <p className="text-white/90 text-lg font-semibold">{project.market_scope}</p>
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
                                    <div className="prose prose-invert max-w-none text-white/80 leading-relaxed">
                                        <p>{project.long_description}</p>
                                    </div>
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


