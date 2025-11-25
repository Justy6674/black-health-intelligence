import { ImageResponse } from 'next/og'
import { OgTemplate, OG_HEIGHT, OG_WIDTH } from '@/lib/ogTemplate'

export const size = {
    width: OG_WIDTH,
    height: OG_HEIGHT,
}

export const contentType = 'image/png'

export default function TwitterImage() {
    return new ImageResponse(<OgTemplate />, size)
}

