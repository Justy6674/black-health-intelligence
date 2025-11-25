'use client'

import { useEffect, useRef } from 'react'

export default function TechGridBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let time = 0

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        const drawGrid = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Set context for 3D-like grid effect
            const horizon = canvas.height * 0.4
            const gridSize = 40
            
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)' // Sky blue low opacity
            ctx.lineWidth = 1

            // Vertical lines (perspective)
            const centerX = canvas.width / 2
            for (let i = -20; i <= 20; i++) {
                const x = centerX + i * 100
                ctx.beginPath()
                ctx.moveTo(centerX, horizon)
                ctx.lineTo(x * 3, canvas.height)
                ctx.stroke()
            }

            // Horizontal lines (moving)
            const speed = 1 // Movement speed
            const offset = (time * speed) % gridSize
            
            for (let i = 0; i < 20; i++) {
                const y = horizon + Math.pow(i, 1.5) * 5 + offset
                if (y > canvas.height) continue
                
                const alpha = Math.max(0, (y - horizon) / (canvas.height - horizon)) * 0.2
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`
                
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(canvas.width, y)
                ctx.stroke()
            }

            // Digital Rain / Data Streams
            for(let i = 0; i < 10; i++) {
                if (Math.random() > 0.95) {
                    const x = Math.random() * canvas.width
                    const height = Math.random() * 100 + 50
                    const y = Math.random() * canvas.height
                    
                    const gradient = ctx.createLinearGradient(x, y, x, y + height)
                    gradient.addColorStop(0, 'rgba(56, 189, 248, 0)')
                    gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)')
                    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)')
                    
                    ctx.fillStyle = gradient
                    ctx.fillRect(x, y, 1, height)
                }
            }

            time++
            animationFrameId = requestAnimationFrame(drawGrid)
        }

        resizeCanvas()
        drawGrid()

        window.addEventListener('resize', resizeCanvas)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0 bg-[#020408]"
        />
    )
}


