import Navigation from '@/components/Navigation'
import PacManBackgroundWrapper from '@/components/ui/PacManBackgroundWrapper'
import AboutPageClient from '@/components/sections/AboutPageClient'
import Footer from '@/components/sections/Footer'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'About | Black Health Intelligence',
    description: 'Learn about Justin Black, Nurse Practitioner & Health-Tech Founder, and the team behind Black Health Intelligence - a healthcare innovation portfolio transforming healthcare delivery.',
}

// Cache for 1 hour since content is static
export const revalidate = 3600

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-black relative overflow-hidden">
            <Navigation />
            <PacManBackgroundWrapper />
            
            <AboutPageClient />
            
            <Footer />
        </main>
    )
}
