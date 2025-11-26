import { createClient } from '@/lib/supabase/server'
import { Project, Tag } from '@/lib/types'
import Navigation from '@/components/Navigation'
import dynamic from 'next/dynamic'
import PlatformPageClient from '@/components/sections/PlatformPageClient'
import Footer from '@/components/sections/Footer'
import { Metadata } from 'next'

// Lazy load the background animation so it doesn't block initial render
const FlowFieldBackground = dynamic(
    () => import('@/components/ui/FlowFieldBackground'),
    { ssr: false }
)

export const metadata: Metadata = {
    title: 'Portfolio | Black Health Intelligence',
    description: 'Explore our portfolio of healthcare and technology projects - clinical practice, health SaaS, and non-health SaaS solutions.',
}

// Cache for 60 seconds instead of no cache
export const revalidate = 60

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
    const [clinicalResult, healthSaasResult, nonHealthSaasResult] = await Promise.all([
        supabase
            .from('projects')
            .select('*')
            .eq('category', 'clinical')
            .neq('status', 'archived')
            .order('display_order', { ascending: true })
            .limit(1),
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
            .order('display_order', { ascending: true })
    ])

    const clinicalData = clinicalResult.data
    const healthSaasData = healthSaasResult.data
    const nonHealthSaasData = nonHealthSaasResult.data

    // Attach tags in parallel
    const allProjects = [
        ...(clinicalData || []),
        ...(healthSaasData || []),
        ...(nonHealthSaasData || [])
    ] as Project[]

    const projectsWithTags = await attachTagsToProjects(supabase, allProjects)

    // Separate back into categories
    const clinicalProject = projectsWithTags.find(p => p.category === 'clinical') || null
    const healthSaasProjects = projectsWithTags.filter(p => p.category === 'health-saas' && p.subcategory === 'health-saas')
    const nonHealthSaasProjects = projectsWithTags.filter(p => p.category === 'health-saas' && p.subcategory === 'non-health-saas')

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
