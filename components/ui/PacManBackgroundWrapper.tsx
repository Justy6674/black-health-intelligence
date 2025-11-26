'use client'

import dynamic from 'next/dynamic'

// Dynamically import PacManBackground with ssr: false for performance
const PacManBackground = dynamic(() => import('./PacManBackground'), { ssr: false })

export default function PacManBackgroundWrapper() {
    return <PacManBackground />
}

