import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'
import Navigation from '@/components/Navigation'
import FlowFieldBackground from '@/components/ui/FlowFieldBackground'
import PlatformPageClient from '@/components/sections/PlatformPageClient'
import Footer from '@/components/sections/Footer'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Portfolio | Black Health Intelligence',
    description: 'Explore our portfolio of healthcare and technology projects - clinical practice, health SaaS, and non-health SaaS solutions.',
}

export const revalidate = 0

export default async function PortfolioPage() {
    const supabase = await createClient()

    // Fetch clinical project (featured)
    const { data: clinicalData } = await supabase
        .from('projects')
        .select('*')
        .eq('category', 'clinical')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })
        .limit(1)

    const clinicalProject = clinicalData && clinicalData.length > 0 ? (clinicalData[0] as Project) : null

    // Fetch health SaaS projects
    const { data: healthSaasData } = await supabase
        .from('projects')
        .select('*')
        .eq('category', 'health-saas')
        .eq('subcategory', 'health-saas')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })

    const healthSaasProjects = (healthSaasData || []) as Project[]

    // Fetch non-health SaaS projects
    const { data: nonHealthSaasData } = await supabase
        .from('projects')
        .select('*')
        .eq('category', 'health-saas')
        .eq('subcategory', 'non-health-saas')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })

    const nonHealthSaasProjects = (nonHealthSaasData || []) as Project[]

    return (
        <main className="min-h-screen bg-deep-black relative overflow-hidden">
            <Navigation />
            <FlowFieldBackground />
            
            <PlatformPageClient 
                clinicalProject={clinicalProject}
                healthSaasProjects={healthSaasProjects}
                nonHealthSaasProjects={nonHealthSaasProjects}
            />
            
            <Footer />
        </main>
    )
}
