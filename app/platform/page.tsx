import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'
import Navigation from '@/components/Navigation'
import NeuralBackground from '@/components/ui/NeuralBackground'
import PortfolioSection from '@/components/sections/PortfolioSection'
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
            <NeuralBackground opacity={0.2} particleCount={50} />
            
            <div className="pt-32 pb-20 relative z-10">
                <PortfolioSection
                    title="Health Technology"
                    description="Innovative SaaS platforms transforming healthcare delivery through AI and data."
                    projects={saasProjects}
                />
            </div>
            
            <Footer />
        </main>
    )
}

