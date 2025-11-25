import { createClient } from '@/lib/supabase/server'
import Navigation from '@/components/Navigation'
import TechGridBackground from '@/components/ui/TechGridBackground'
import SolutionsPageClient from '@/components/sections/SolutionsPageClient'
import Footer from '@/components/sections/Footer'

export const revalidate = 0

export default async function SolutionsPage() {
    const supabase = await createClient()

    // Fetch all solutions content
    const { data: content } = await supabase
        .from('solutions_content')
        .select('*')
        .order('display_order', { ascending: true })

    const sections = content || []

    return (
        <main className="min-h-screen bg-black relative overflow-hidden font-mono">
            <Navigation />
            <TechGridBackground />
            
            <SolutionsPageClient sections={sections} />
            
            <Footer />
        </main>
    )
}
