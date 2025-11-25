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

    // Fetch all projects
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })

    const allProjects = (projects || []) as Project[]

    // Categorize projects
    const clinicalProjects = allProjects.filter(p => p.category === 'clinical')
    const healthSaasProjects = allProjects.filter(p => p.category === 'health-saas')
    const otherProjects = allProjects.filter(p => p.category === 'other')

    return (
        <main className="min-h-screen">
            <Navigation />
            <Hero />

            {clinicalProjects.length > 0 && (
                <PortfolioSection
                    title="Clinical Practice"
                    description="Direct patient care and clinical services"
                    projects={clinicalProjects}
                />
            )}

            {healthSaasProjects.length > 0 && (
                <PortfolioSection
                    title="Health Technology"
                    description="Innovative SaaS platforms transforming healthcare delivery"
                    projects={healthSaasProjects}
                />
            )}

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
