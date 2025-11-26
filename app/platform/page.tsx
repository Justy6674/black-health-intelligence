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

    // Fetch all project categories in parallel for faster loading
    const [clinicalResult, healthSaasResult, nonHealthSaasResult, partnerSolutionsResult] = await Promise.all([
        supabase
            .from('projects')
            .select('*')
            .eq('category', 'clinical')
            .neq('status', 'archived')
            .order('display_order', { ascending: true }),
        supabase
            .from('projects')
            .select('*')
            .eq('category', 'health-saas')
            .eq('subcategory', 'health-saas')
            .neq('status', 'archived')
            .order('display_order', { ascending: true }),
        supabase
            .from('projects')
            .select('*')
            .eq('category', 'health-saas')
            .eq('subcategory', 'non-health-saas')
            .neq('status', 'archived')
            .order('display_order', { ascending: true }),
        supabase
            .from('projects')
            .select('*')
            .eq('category', 'partner-solutions')
            .neq('status', 'archived')
            .order('display_order', { ascending: true })
    ])

    const clinicalData = clinicalResult.data
    const healthSaasData = healthSaasResult.data
    const nonHealthSaasData = nonHealthSaasResult.data
    const partnerSolutionsData = partnerSolutionsResult.data

    // Debug: Log what we got from database
    console.log('=== PORTFOLIO DEBUG ===')
    console.log('Clinical projects:', clinicalData?.length, clinicalData?.map(p => p.name))
    console.log('Health SaaS projects:', healthSaasData?.length, healthSaasData?.map(p => p.name))
    console.log('Non-Health SaaS projects:', nonHealthSaasData?.length, nonHealthSaasData?.map(p => p.name))
    console.log('Partner Solutions:', partnerSolutionsData?.length, partnerSolutionsData?.map(p => p.name))
    if (healthSaasResult.error) console.log('Health SaaS ERROR:', healthSaasResult.error)
    console.log('=== END DEBUG ===')

    // Attach tags in parallel
    const allProjects = [
        ...(clinicalData || []),
        ...(healthSaasData || []),
        ...(nonHealthSaasData || []),
        ...(partnerSolutionsData || [])
    ] as Project[]

    const projectsWithTags = await attachTagsToProjects(supabase, allProjects)

    // Separate back into categories
    const clinicalProjects = projectsWithTags.filter(p => p.category === 'clinical')
    const healthSaasProjects = projectsWithTags.filter(p => p.category === 'health-saas' && p.subcategory === 'health-saas')
    const nonHealthSaasProjects = projectsWithTags.filter(p => p.category === 'health-saas' && p.subcategory === 'non-health-saas')
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
