import Navigation from '@/components/Navigation'
import PongBackground from '@/components/ui/PongBackground'
import FAQPageClient from '@/components/sections/FAQPageClient'
import Footer from '@/components/sections/Footer'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'FAQ | Black Health Intelligence',
    description: 'Frequently asked questions about Black Health Intelligence, our products, partnerships, and how we work.',
}

export default function FAQPage() {
    return (
        <main className="min-h-screen bg-deep-black relative overflow-hidden">
            <Navigation />
            <PongBackground />
            <FAQPageClient />
            <Footer />
        </main>
    )
}


