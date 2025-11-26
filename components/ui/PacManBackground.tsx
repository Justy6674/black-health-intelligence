'use client'

import { useEffect, useRef } from 'react'

export default function PacManBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number

        // Pac-Man properties
        let pacManX: number
        let pacManY: number
        let pacManVX = 3
        let pacManVY = 2
        const pacManSize = 40
        let mouthAngle = 0
        let mouthDirection = 1
        const mouthSpeed = 0.15
        const maxMouthAngle = 0.4 // radians

        // Direction angle (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
        let direction = 0

        // Dots that Pac-Man leaves behind and eats
        const dots: Array<{ x: number; y: number; alpha: number; size: number }> = []
        const maxDots = 50
        let dotSpawnCounter = 0

        // Ghost dots (decorative)
        const ghostDots: Array<{ x: number; y: number; alpha: number }> = []

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            
            // Reset Pac-Man position
            pacManX = canvas.width / 4
            pacManY = canvas.height / 2
        }

        const drawGrid = () => {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.03)'
            ctx.lineWidth = 1
            
            // Vertical lines
            for (let x = 0; x < canvas.width; x += 50) {
                ctx.beginPath()
                ctx.moveTo(x, 0)
                ctx.lineTo(x, canvas.height)
                ctx.stroke()
            }
            
            // Horizontal lines
            for (let y = 0; y < canvas.height; y += 50) {
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(canvas.width, y)
                ctx.stroke()
            }
        }

        const drawPacMan = () => {
            ctx.save()
            ctx.translate(pacManX, pacManY)
            ctx.rotate(direction)
            
            // Glow effect
            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
            ctx.shadowBlur = 30
            
            // Main body
            ctx.fillStyle = 'rgba(255, 215, 0, 0.85)'
            ctx.beginPath()
            
            // Draw Pac-Man with animated mouth
            const startAngle = mouthAngle
            const endAngle = Math.PI * 2 - mouthAngle
            
            ctx.arc(0, 0, pacManSize / 2, startAngle, endAngle)
            ctx.lineTo(0, 0)
            ctx.closePath()
            ctx.fill()
            
            // Eye
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
            ctx.beginPath()
            ctx.arc(5, -pacManSize / 4, 4, 0, Math.PI * 2)
            ctx.fill()
            
            ctx.restore()
            
            // Reset shadow
            ctx.shadowBlur = 0
        }

        const drawDots = () => {
            dots.forEach((dot, index) => {
                // Check if Pac-Man is close to eat the dot
                const dx = pacManX - dot.x
                const dy = pacManY - dot.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                if (distance < pacManSize / 2 + dot.size) {
                    // Pac-Man eats the dot
                    dot.alpha -= 0.1
                } else {
                    // Slowly fade
                    dot.alpha -= 0.002
                }
                
                if (dot.alpha <= 0) {
                    dots.splice(index, 1)
                    return
                }
                
                // Draw dot with glow
                ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
                ctx.shadowBlur = 10
                ctx.fillStyle = `rgba(255, 215, 0, ${dot.alpha})`
                ctx.beginPath()
                ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2)
                ctx.fill()
                ctx.shadowBlur = 0
            })
        }

        const drawGhostDots = () => {
            ghostDots.forEach((dot, index) => {
                dot.alpha -= 0.01
                
                if (dot.alpha <= 0) {
                    ghostDots.splice(index, 1)
                    return
                }
                
                ctx.fillStyle = `rgba(255, 215, 0, ${dot.alpha * 0.3})`
                ctx.beginPath()
                ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2)
                ctx.fill()
            })
        }

        const spawnDot = () => {
            // Spawn dots ahead of Pac-Man's path
            const spawnDistance = 100
            const spawnX = pacManX + Math.cos(direction) * spawnDistance + (Math.random() - 0.5) * 200
            const spawnY = pacManY + Math.sin(direction) * spawnDistance + (Math.random() - 0.5) * 200
            
            // Keep within bounds
            if (spawnX > 50 && spawnX < canvas.width - 50 && 
                spawnY > 50 && spawnY < canvas.height - 50) {
                dots.push({
                    x: spawnX,
                    y: spawnY,
                    alpha: 0.8,
                    size: 6 + Math.random() * 4
                })
            }
            
            // Also spawn ghost dots randomly
            if (Math.random() > 0.7) {
                ghostDots.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    alpha: 0.5
                })
            }
        }

        const updatePacMan = () => {
            // Move Pac-Man
            pacManX += pacManVX
            pacManY += pacManVY
            
            // Bounce off walls
            if (pacManX <= pacManSize / 2 || pacManX >= canvas.width - pacManSize / 2) {
                pacManVX = -pacManVX
                pacManX = Math.max(pacManSize / 2, Math.min(canvas.width - pacManSize / 2, pacManX))
            }
            
            if (pacManY <= pacManSize / 2 || pacManY >= canvas.height - pacManSize / 2) {
                pacManVY = -pacManVY
                pacManY = Math.max(pacManSize / 2, Math.min(canvas.height - pacManSize / 2, pacManY))
            }
            
            // Update direction based on velocity
            direction = Math.atan2(pacManVY, pacManVX)
            
            // Animate mouth
            mouthAngle += mouthSpeed * mouthDirection
            if (mouthAngle >= maxMouthAngle || mouthAngle <= 0.05) {
                mouthDirection = -mouthDirection
            }
            
            // Spawn dots periodically
            dotSpawnCounter++
            if (dotSpawnCounter >= 20 && dots.length < maxDots) {
                spawnDot()
                dotSpawnCounter = 0
            }
        }

        const draw = () => {
            // Clear with slight fade for trail effect
            ctx.fillStyle = 'rgba(5, 5, 5, 0.15)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Draw grid
            drawGrid()
            
            // Draw ghost dots
            drawGhostDots()
            
            // Draw dots
            drawDots()
            
            // Update and draw Pac-Man
            updatePacMan()
            drawPacMan()
            
            animationFrameId = requestAnimationFrame(draw)
        }

        resizeCanvas()
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
            className="fixed inset-0 pointer-events-none bg-[#050505]"
            style={{ zIndex: 0 }}
        />
    )
}

