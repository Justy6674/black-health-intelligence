import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'
import Navigation from '@/components/Navigation'
import NeuralBackground from '@/components/ui/NeuralBackground'
import PortfolioSection from '@/components/sections/PortfolioSection'
import Footer from '@/components/sections/Footer'

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
        <main className="min-h-screen bg-deep-black relative overflow-hidden">
            <Navigation />
            <NeuralBackground opacity={0.15} particleCount={40} />
            
            <div className="pt-32 pb-20 relative z-10">
                <PortfolioSection
                    title="Clinical Practice"
                    description="Direct patient care and clinical services powered by intelligence."
                    projects={clinicalProjects}
                />
            </div>
            
            <Footer />
        </main>
    )
}

