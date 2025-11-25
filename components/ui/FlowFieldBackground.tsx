'use client'

import { useEffect, useRef } from 'react'

export default function FlowFieldBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let particles: Array<{
            x: number
            y: number
            vx: number
            vy: number
            history: Array<{x: number, y: number}>
            hue: number
        }> = []

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        const createParticles = () => {
            particles = []
            for (let i = 0; i < 50; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: 0,
                    vy: 0,
                    history: [],
                    hue: Math.random() * 60 + 200 // Blue/Purple range
                })
            }
        }

        const draw = () => {
            // Fade effect
            ctx.fillStyle = 'rgba(5, 5, 5, 0.05)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]
                
                // Flow field math
                const angle = (p.x / canvas.width) * Math.PI * 2 + (p.y / canvas.height) * Math.PI
                p.vx += Math.cos(angle) * 0.1
                p.vy += Math.sin(angle) * 0.1
                
                // Friction
                p.vx *= 0.99
                p.vy *= 0.99
                
                p.x += p.vx
                p.y += p.vy

                // Wrap around
                if (p.x < 0) p.x = canvas.width
                if (p.x > canvas.width) p.x = 0
                if (p.y < 0) p.y = canvas.height
                if (p.y > canvas.height) p.y = 0

                // Draw
                ctx.strokeStyle = `hsla(${p.hue}, 70%, 50%, 0.5)`
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2)
                ctx.stroke()
            }

            animationFrameId = requestAnimationFrame(draw)
        }

        resizeCanvas()
        createParticles()
        draw()

        window.addEventListener('resize', resizeCanvas)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0 bg-[#050505]"
        />
    )
}

