import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'
import Navigation from '@/components/Navigation'
import Hero from '@/components/sections/Hero'
import PortfolioSection from '@/components/sections/PortfolioSection'
import About from '@/components/sections/About'
import Footer from '@/components/sections/Footer'

export const revalidate = 0 // Disable caching for now

export default async function Home() {
    const supabase = await createClient()

    // Fetch "other" projects for the home page innovation lab
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'archived')
        .eq('category', 'other')
        .order('display_order', { ascending: true })

    const otherProjects = (projects || []) as Project[]

    return (
        <main className="min-h-screen bg-[#050505]">
            <Navigation />
            <Hero />

            {otherProjects.length > 0 && (
                <PortfolioSection
                    title="Innovation Lab"
                    description="Exploring new frontiers in health and wellness"
                    projects={otherProjects}
                />
            )}

            <About />
            <Footer />
        </main>
    )
}
