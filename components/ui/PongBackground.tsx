'use client'

import { useEffect, useRef } from 'react'

export default function PongBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number

        // Ball properties
        let ballX: number
        let ballY: number
        let ballVX = 4
        let ballVY = 3
        const ballSize = 12

        // Paddle properties
        const paddleWidth = 12
        const paddleHeight = 80
        let leftPaddleY: number
        let rightPaddleY: number
        const paddleSpeed = 3

        // Trail effect
        const trails: Array<{ x: number; y: number; alpha: number }> = []

        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            
            // Reset ball position
            ballX = canvas.width / 2
            ballY = canvas.height / 2
            
            // Reset paddle positions
            leftPaddleY = canvas.height / 2 - paddleHeight / 2
            rightPaddleY = canvas.height / 2 - paddleHeight / 2
        }

        const drawGrid = () => {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
            ctx.lineWidth = 1
            
            // Vertical lines
            for (let x = 0; x < canvas.width; x += 40) {
                ctx.beginPath()
                ctx.moveTo(x, 0)
                ctx.lineTo(x, canvas.height)
                ctx.stroke()
            }
            
            // Horizontal lines
            for (let y = 0; y < canvas.height; y += 40) {
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(canvas.width, y)
                ctx.stroke()
            }
        }

        const drawDashedCenter = () => {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
            ctx.lineWidth = 2
            ctx.setLineDash([20, 15])
            ctx.beginPath()
            ctx.moveTo(canvas.width / 2, 0)
            ctx.lineTo(canvas.width / 2, canvas.height)
            ctx.stroke()
            ctx.setLineDash([])
        }

        const drawPaddle = (x: number, y: number) => {
            // Glow effect
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'
            ctx.shadowBlur = 15
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
            ctx.fillRect(x, y, paddleWidth, paddleHeight)
            
            // Reset shadow
            ctx.shadowBlur = 0
        }

        const drawBall = () => {
            // Add to trails
            trails.push({ x: ballX, y: ballY, alpha: 0.6 })
            if (trails.length > 15) trails.shift()
            
            // Draw trails
            trails.forEach((trail, i) => {
                const size = ballSize * (i / trails.length)
                ctx.fillStyle = `rgba(255, 255, 255, ${trail.alpha * (i / trails.length)})`
                ctx.fillRect(
                    trail.x - size / 2,
                    trail.y - size / 2,
                    size,
                    size
                )
            })
            
            // Glow effect for main ball
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
            ctx.shadowBlur = 20
            
            // Main ball (square for retro feel)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
            ctx.fillRect(ballX - ballSize / 2, ballY - ballSize / 2, ballSize, ballSize)
            
            // Reset shadow
            ctx.shadowBlur = 0
        }

        const updatePaddles = () => {
            // Left paddle follows ball with slight delay
            const leftTarget = ballY - paddleHeight / 2
            if (leftPaddleY < leftTarget) {
                leftPaddleY += paddleSpeed
            } else if (leftPaddleY > leftTarget) {
                leftPaddleY -= paddleSpeed
            }
            
            // Right paddle follows ball with slight delay
            const rightTarget = ballY - paddleHeight / 2
            if (rightPaddleY < rightTarget) {
                rightPaddleY += paddleSpeed
            } else if (rightPaddleY > rightTarget) {
                rightPaddleY -= paddleSpeed
            }
            
            // Keep paddles in bounds
            leftPaddleY = Math.max(0, Math.min(canvas.height - paddleHeight, leftPaddleY))
            rightPaddleY = Math.max(0, Math.min(canvas.height - paddleHeight, rightPaddleY))
        }

        const updateBall = () => {
            ballX += ballVX
            ballY += ballVY
            
            // Top/bottom bounce
            if (ballY <= ballSize / 2 || ballY >= canvas.height - ballSize / 2) {
                ballVY = -ballVY
                ballY = Math.max(ballSize / 2, Math.min(canvas.height - ballSize / 2, ballY))
            }
            
            // Left paddle collision
            if (ballX <= 30 + paddleWidth + ballSize / 2 && 
                ballY >= leftPaddleY && 
                ballY <= leftPaddleY + paddleHeight) {
                ballVX = Math.abs(ballVX)
                // Add some angle based on where it hit the paddle
                const hitPos = (ballY - leftPaddleY) / paddleHeight
                ballVY = (hitPos - 0.5) * 6
            }
            
            // Right paddle collision
            if (ballX >= canvas.width - 30 - paddleWidth - ballSize / 2 && 
                ballY >= rightPaddleY && 
                ballY <= rightPaddleY + paddleHeight) {
                ballVX = -Math.abs(ballVX)
                // Add some angle based on where it hit the paddle
                const hitPos = (ballY - rightPaddleY) / paddleHeight
                ballVY = (hitPos - 0.5) * 6
            }
            
            // Reset if ball goes off screen (shouldn't happen with AI paddles)
            if (ballX < 0 || ballX > canvas.width) {
                ballX = canvas.width / 2
                ballY = canvas.height / 2
                ballVX = (Math.random() > 0.5 ? 1 : -1) * 4
                ballVY = (Math.random() - 0.5) * 6
            }
        }

        const draw = () => {
            // Clear with slight fade for trail effect
            ctx.fillStyle = 'rgba(5, 5, 5, 0.3)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            
            // Draw grid
            drawGrid()
            
            // Draw center line
            drawDashedCenter()
            
            // Update game state
            updatePaddles()
            updateBall()
            
            // Draw paddles
            drawPaddle(30, leftPaddleY)
            drawPaddle(canvas.width - 30 - paddleWidth, rightPaddleY)
            
            // Draw ball
            drawBall()
            
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


