'use client'

import dynamic from 'next/dynamic'

// Lazy load the background animation so it doesn't block initial render
const FlowFieldBackground = dynamic(
    () => import('@/components/ui/FlowFieldBackground'),
    { ssr: false }
)

export default function FlowFieldBackgroundWrapper() {
    return <FlowFieldBackground />
}

