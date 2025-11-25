export interface Project {
    id: string
    name: string
    slug: string
    category: 'clinical' | 'health-saas' | 'other'
    subcategory?: 'health-saas' | 'non-health-saas'
    short_description: string
    long_description?: string
    logo_url?: string
    website_url?: string
    status: 'active' | 'development' | 'coming-soon' | 'archived'
    display_order: number
    featured: boolean
    problem_solves?: string
    target_audience?: string
    build_details?: string
    estimated_release?: string
    revenue_stream?: string
    market_scope?: 'Local Australian' | 'International' | 'Both'
    for_sale?: boolean
    sale_price?: number
    investment_opportunity?: boolean
    development_phase?: 'concept' | 'mvp' | 'beta' | 'production'
    created_at: string
    updated_at: string
}

export interface SolutionsContent {
    id: string
    section: 'company_mission' | 'founder_bio' | 'career_history' | 'downscale_history' | 'clinical_governance' | 'software_journey' | 'bec_story' | 'vision'
    content: string
    display_order: number
    created_at: string
    updated_at: string
}

export interface SiteSetting {
    key: string
    value: string
    updated_at: string
}

export type ProjectCategory = Project['category']
export type ProjectStatus = Project['status']
export type ProjectSubcategory = Project['subcategory']
export type MarketScope = Project['market_scope']
export type DevelopmentPhase = Project['development_phase']
export type SolutionsSection = SolutionsContent['section']
