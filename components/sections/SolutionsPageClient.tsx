'use client'

import { motion } from 'framer-motion'
import { SolutionsContent } from '@/lib/types'

interface SolutionsPageClientProps {
    sections: SolutionsContent[]
}

const sectionTitles: Record<string, string> = {
    company_mission: 'Company Mission',
    founder_bio: 'Founder Bio',
    career_history: 'Career History',
    downscale_history: 'Downscale Business',
    clinical_governance: 'Clinical Governance',
    software_journey: 'Software Development Journey',
    bec_story: 'Bec&apos;s Story',
    vision: 'Vision'
}

export default function SolutionsPageClient({ sections }: SolutionsPageClientProps) {
    // If no content, show placeholder
    if (sections.length === 0) {
        return (
            <div className="pt-32 pb-20 relative z-10 section-container">
                <div className="mb-16 relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500/50"></div>
                    <h1 className="heading-chrome text-4xl md:text-5xl mb-4 pl-6">
                        OUR STORY
                    </h1>
                    <p className="text-blue-200/60 max-w-2xl text-lg pl-6 border-l border-blue-500/20">
                        Content will be available here once added from the admin panel.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="pt-32 pb-20 relative z-10 section-container">
            {/* Header */}
            <div className="mb-16 relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500/50"></div>
                <h1 className="heading-chrome text-4xl md:text-5xl mb-4 pl-6">
                    OUR STORY
                </h1>
                <p className="text-blue-200/60 max-w-2xl text-lg pl-6 border-l border-blue-500/20">
                    The journey of Black Health Intelligence from clinical practice to innovation lab.
                </p>
            </div>

            {/* Content Sections */}
            <div className="space-y-16">
                {sections.map((section, index) => (
                    <motion.section
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="relative"
                    >
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500/30"></div>
                        <div className="pl-8">
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">
                                {sectionTitles[section.section] || section.section}
                            </h2>
                            <div 
                                className="prose prose-invert max-w-none text-blue-200/80 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: section.content }}
                            />
                        </div>
                    </motion.section>
                ))}
            </div>
        </div>
    )
}

