export interface Project {
    id: string
    name: string
    slug: string
    category: 'clinical' | 'health-saas' | 'other'
    short_description: string
    long_description?: string
    logo_url?: string
    website_url?: string
    status: 'active' | 'development' | 'coming-soon' | 'archived'
    display_order: number
    featured: boolean
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
