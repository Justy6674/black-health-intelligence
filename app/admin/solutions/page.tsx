import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SolutionsContentEditor from '@/components/admin/SolutionsContentEditor'
import { SolutionsContent } from '@/lib/types'

export const revalidate = 0

export default async function SolutionsAdminPage() {
    const supabase = await createClient()

    const { data: sections } = await supabase
        .from('solutions_content')
        .select('*')
        .order('display_order', { ascending: true })

    const allSections = (sections || []) as SolutionsContent[]

    // Define all possible sections
    const allPossibleSections: SolutionsContent['section'][] = [
        'company_mission',
        'founder_bio',
        'career_history',
        'downscale_history',
        'clinical_governance',
        'software_journey',
        'bec_story',
        'vision'
    ]

    // Create entries for missing sections
    const existingSectionKeys = new Set(allSections.map(s => s.section))
    const missingSections = allPossibleSections
        .filter(key => !existingSectionKeys.has(key))
        .map((section, index) => ({
            id: '',
            section,
            content: '',
            display_order: allSections.length + index,
            created_at: '',
            updated_at: ''
        }))

    const sectionsToEdit = [...allSections, ...missingSections].sort((a, b) => a.display_order - b.display_order)

    return (
        <div>
            <div className="mb-8">
                <Link href="/admin" className="text-silver-400 hover:text-white transition-colors mb-4 inline-block">
                    ← Back to Admin
                </Link>
                <h1 className="heading-lg text-white mb-2">Solutions Page Content</h1>
                <p className="text-silver-400">Edit the content for the Solutions/About page</p>
            </div>

            <SolutionsContentEditor initialSections={sectionsToEdit} />
        </div>
    )
}

