'use client'

import { motion } from 'framer-motion'
import { Project } from '@/lib/types'
import ProjectCard from '@/components/ui/ProjectCard'

interface PortfolioSectionProps {
    id?: string
    title: string
    description?: string
    projects: Project[]
}

export default function PortfolioSection({ id, title, description, projects }: PortfolioSectionProps) {
    if (projects.length === 0) return null

    return (
        <section id={id} className="section-container scroll-mt-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-12 text-center"
            >
                <h2 className="heading-lg mb-4 text-white inline-block">
                    {title}
                </h2>
                <div className="w-24 h-[1px] bg-[var(--electric-blue)] opacity-50 mx-auto mb-6"></div>
                {description && (
                    <p className="text-silver-400 text-lg max-w-3xl mx-auto">
                        {description}
                    </p>
                )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index} />
                ))}
            </div>
        </section>
    )
}
