'use client'

import { useEffect, useRef } from 'react'

interface NeuralBackgroundProps {
    opacity?: number
    particleCount?: number
}

export default function NeuralBackground({ 
    opacity = 0.3,
    particleCount = 60 
}: NeuralBackgroundProps) {
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
            size: number
        }> = []

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        const createParticles = () => {
            particles = []
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1
                })
            }
        }

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Update positions
            particles.forEach(p => {
                p.x += p.vx
                p.y += p.vy

                // Bounce off edges
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1
            })

            // Draw connections
            ctx.lineWidth = 1
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i]
                // Connect to nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j]
                    const dx = p1.x - p2.x
                    const dy = p1.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < 150) {
                        const alpha = (1 - dist / 150) * opacity
                        ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})` // Electric blue
                        ctx.beginPath()
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.stroke()
                    }
                }
                
                // Draw particle node
                ctx.fillStyle = `rgba(192, 192, 192, ${opacity + 0.2})` // Silver
                ctx.beginPath()
                ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2)
                ctx.fill()
            }

            animationFrameId = requestAnimationFrame(drawParticles)
        }

        resizeCanvas()
        createParticles()
        drawParticles()

        window.addEventListener('resize', () => {
            resizeCanvas()
            createParticles()
        })

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            cancelAnimationFrame(animationFrameId)
        }
    }, [opacity, particleCount])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
        />
    )
}



