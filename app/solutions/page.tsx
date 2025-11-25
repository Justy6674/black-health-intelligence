import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'
import Navigation from '@/components/Navigation'
import TechGridBackground from '@/components/ui/TechGridBackground'
import ProjectCard from '@/components/ui/ProjectCard'
import Footer from '@/components/sections/Footer'
import { motion } from 'framer-motion'

export const revalidate = 0

export default async function SolutionsPage() {
    const supabase = await createClient()

    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('category', 'clinical')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })

    const clinicalProjects = (projects || []) as Project[]

    return (
        <main className="min-h-screen bg-black relative overflow-hidden font-mono">
            <Navigation />
            <TechGridBackground />
            
            <div className="pt-32 pb-20 relative z-10 section-container">
                {/* Header */}
                <div className="mb-16 relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-500/50"></div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-4 pl-6">
                        CLINICAL_SOLUTIONS
                        <span className="animate-pulse text-blue-500">_</span>
                    </h1>
                    <p className="text-blue-200/60 max-w-2xl text-lg pl-6 border-l border-blue-500/20">
                        Direct patient care systems powered by intelligence. 
                        Optimized for efficiency and clinical excellence.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {clinicalProjects.map((project, index) => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            index={index} 
                            variant="industrial"
                        />
                    ))}
                </div>
            </div>
            
            <Footer />
        </main>
    )
}

