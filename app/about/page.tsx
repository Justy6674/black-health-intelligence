import { createClient } from '@/lib/supabase/server'
import Navigation from '@/components/Navigation'
import TechGridBackground from '@/components/ui/TechGridBackground'
import SolutionsPageClient from '@/components/sections/SolutionsPageClient'
import Footer from '@/components/sections/Footer'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'About | Black Health Intelligence',
    description: 'Learn about Black Health Intelligence - a healthcare innovation portfolio founded by a Nurse Practitioner with a passion for transforming healthcare delivery.',
}

export const revalidate = 0

export default async function AboutPage() {
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
