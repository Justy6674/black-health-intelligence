'use client'

import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050505]">
            {/* 1. Perspective Grid Floor */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-[50vh] opacity-20"
                style={{
                    background: 'linear-gradient(to bottom, transparent, rgba(14, 165, 233, 0.1))',
                    perspective: '1000px',
                    transformStyle: 'preserve-3d'
                }}
            >
                <div 
                    className="absolute inset-0 w-full h-[200%]"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        transform: 'rotateX(60deg) translateY(-20%)',
                        transformOrigin: 'top center'
                    }}
                />
            </div>

            {/* 2. Floating Tech Geometric Shapes */}
            {/* Left Cube */}
            <motion.div
                className="absolute left-[15%] top-[25%] w-24 h-24 border border-white/10"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                    backdropFilter: 'blur(2px)',
                }}
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 15, 0],
                    rotateY: [0, 30, 0]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            {/* Right Cube */}
            <motion.div
                className="absolute right-[15%] bottom-[30%] w-32 h-32 border border-white/10"
                style={{
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(14,165,233,0.01))',
                    backdropFilter: 'blur(2px)',
                }}
                animate={{
                    y: [0, 30, 0],
                    rotate: [0, -15, 0],
                    rotateX: [0, 20, 0]
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            {/* Small wireframe particles */}
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute border border-white/20"
                    style={{
                        width: Math.random() * 40 + 20,
                        height: Math.random() * 40 + 20,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        opacity: 0.3
                    }}
                    animate={{
                        y: [0, Math.random() * 100 - 50, 0],
                        rotate: [0, 180, 360],
                        opacity: [0.2, 0.5, 0.2]
                    }}
                    transition={{
                        duration: 15 + Math.random() * 10,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            ))}

            {/* Content */}
            <div className="relative z-10 section-container text-center mt-[-5vh]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    {/* Main title with METALLIC GRADIENT */}
                    <motion.h1
                        className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight"
                        style={{
                            textShadow: '0 0 40px rgba(14, 165, 233, 0.3)'
                        }}
                    >
                        <span 
                            className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-500 mb-2"
                        >
                            BLACK HEALTH
                        </span>
                        <span 
                            className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-[var(--electric-blue)] to-[#024d70]"
                            style={{ filter: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.5))' }}
                        >
                            INTELLIGENCE
                        </span>
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        className="text-lg md:text-xl text-gray-400 font-light tracking-widest uppercase mb-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Building the Future of Healthcare Technology
                    </motion.p>

                    {/* CTA Button - Outlined with Glow */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <button
                            className="px-10 py-3 bg-transparent border border-white/20 text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/5 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"
                        >
                            Learn More
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
