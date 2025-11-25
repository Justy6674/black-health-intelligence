import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'
import Navigation from '@/components/Navigation'
import FlowFieldBackground from '@/components/ui/FlowFieldBackground'
import ProjectCard from '@/components/ui/ProjectCard'
import Footer from '@/components/sections/Footer'

export const revalidate = 0

export default async function PlatformPage() {
    const supabase = await createClient()

    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('category', 'health-saas')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })

    const saasProjects = (projects || []) as Project[]

    return (
        <main className="min-h-screen bg-deep-black relative overflow-hidden">
            <Navigation />
            <FlowFieldBackground />
            
            <div className="pt-32 pb-20 relative z-10 section-container">
                {/* Header */}
                <div className="text-center mb-20">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent tracking-tight">
                        Health Technology
                    </h1>
                    <p className="text-white/60 text-xl max-w-3xl mx-auto font-light leading-relaxed">
                        Innovative SaaS platforms transforming healthcare delivery through 
                        <span className="text-[var(--electric-blue)]"> fluid intelligence</span> and data.
                    </p>
                    <div className="w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mt-8 opacity-50"></div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {saasProjects.map((project, index) => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            index={index} 
                            variant="artistic"
                        />
                    ))}
                </div>
            </div>
            
            <Footer />
        </main>
    )
}

