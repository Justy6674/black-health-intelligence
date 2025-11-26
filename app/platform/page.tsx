import { createClient } from '@/lib/supabase/server'
import { Project, Tag } from '@/lib/types'
import Navigation from '@/components/Navigation'
import PlatformPageClient from '@/components/sections/PlatformPageClient'
import Footer from '@/components/sections/Footer'
import { Metadata } from 'next'
import FlowFieldBackgroundWrapper from '@/components/ui/FlowFieldBackgroundWrapper'

export const metadata: Metadata = {
    title: 'Portfolio | Black Health Intelligence',
    description: 'Explore our portfolio of healthcare and technology projects - clinical practice, health SaaS, and non-health SaaS solutions.',
}

// No caching to ensure fresh content
export const revalidate = 0

// Helper to attach tags to projects
async function attachTagsToProjects(supabase: any, projects: Project[]): Promise<Project[]> {
    if (projects.length === 0) return projects
    
    const projectIds = projects.map(p => p.id)
    const { data: projectTags } = await supabase
        .from('project_tags')
        .select('project_id, tags(*)')
        .in('project_id', projectIds)
    
    return projects.map(project => ({
        ...project,
        tags: (projectTags || [])
            .filter((pt: any) => pt.project_id === project.id)
            .map((pt: any) => pt.tags)
            .filter(Boolean) as Tag[]
    }))
}

export default async function PortfolioPage() {
    const supabase = await createClient()

    // Fetch all projects at once, then filter - simpler and catches all edge cases
    const { data: allProjectsRaw } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'archived')
        .order('display_order', { ascending: true })
    
    // Filter into categories - health-saas without subcategory defaults to health-saas section
    const clinicalData = allProjectsRaw?.filter((p: any) => p.category === 'clinical') || []
    const healthSaasData = allProjectsRaw?.filter((p: any) => 
        p.category === 'health-saas' && (p.subcategory === 'health-saas' || !p.subcategory)
    ) || []
    const nonHealthSaasData = allProjectsRaw?.filter((p: any) => 
        p.category === 'health-saas' && p.subcategory === 'non-health-saas'
    ) || []
    const partnerSolutionsData = allProjectsRaw?.filter((p: any) => p.category === 'partner-solutions') || []

    // Combine all for tag attachment
    const allProjects = [
        ...clinicalData,
        ...healthSaasData,
        ...nonHealthSaasData,
        ...partnerSolutionsData
    ] as Project[]

    const projectsWithTags = await attachTagsToProjects(supabase, allProjects)

    // Separate back into categories (now with tags attached)
    const clinicalProjects = projectsWithTags.filter(p => p.category === 'clinical')
    const healthSaasProjects = projectsWithTags.filter(p => 
        p.category === 'health-saas' && (p.subcategory === 'health-saas' || !p.subcategory)
    )
    const nonHealthSaasProjects = projectsWithTags.filter(p => 
        p.category === 'health-saas' && p.subcategory === 'non-health-saas'
    )
    const partnerSolutionsProjects = projectsWithTags.filter(p => p.category === 'partner-solutions')

    return (
        <main className="min-h-screen bg-deep-black relative overflow-hidden">
            <Navigation />
            <FlowFieldBackgroundWrapper />
            
            <PlatformPageClient 
                clinicalProjects={clinicalProjects}
                healthSaasProjects={healthSaasProjects}
                nonHealthSaasProjects={nonHealthSaasProjects}
                partnerSolutionsProjects={partnerSolutionsProjects}
            />
            
            <Footer />
        </main>
    )
}
