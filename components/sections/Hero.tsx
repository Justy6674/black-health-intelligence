'use client'

import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-deep-black">
            {/* Dramatic perspective grid background */}
            <div className="absolute inset-0" style={{ perspective: '1000px' }}>
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.15) 2px, transparent 2px),
              linear-gradient(to bottom, rgba(255,255,255,0.15) 2px, transparent 2px)
            `,
                        backgroundSize: '80px 80px',
                        transform: 'rotateX(60deg) scale(2)',
                        transformOrigin: 'center center',
                    }}
                ></div>
                {/* Radial gradient overlay */}
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-deep-black/40 to-deep-black"></div>
            </div>

            {/* MASSIVE glowing orbs */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(150,180,220,0.4) 0%, rgba(100,140,200,0.2) 30%, transparent 60%)',
                    filter: 'blur(80px)',
                }}
                animate={{
                    y: [0, 80, 0],
                    x: [0, 60, 0],
                    scale: [1, 1.4, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-[900px] h-[900px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(180,160,220,0.35) 0%, rgba(120,100,180,0.2) 30%, transparent 60%)',
                    filter: 'blur(90px)',
                }}
                animate={{
                    y: [0, -90, 0],
                    x: [0, -70, 0],
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* 3D Geometric shapes - Spheres */}
            {[...Array(4)].map((_, i) => (
                <motion.div
                    key={`sphere-${i}`}
                    className="absolute w-32 h-32 rounded-full border-2 border-white/20"
                    style={{
                        left: `${20 + i * 25}%`,
                        top: `${20 + (i % 2) * 40}%`,
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                        boxShadow: '0 0 40px rgba(255,255,255,0.1), inset 0 0 40px rgba(255,255,255,0.05)',
                    }}
                    animate={{
                        y: [0, -50 - i * 10, 0],
                        rotate: [0, 180, 360],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 8 + i * 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.5,
                    }}
                />
            ))}

            {/* 3D Geometric shapes - Cubes/Hexagons */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={`hex-${i}`}
                    className="absolute w-24 h-24 border-2 border-white/15"
                    style={{
                        right: `${15 + i * 20}%`,
                        top: `${30 + i * 15}%`,
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                        boxShadow: '0 0 30px rgba(255,255,255,0.08)',
                    }}
                    animate={{
                        y: [0, 40 + i * 10, 0],
                        rotate: [0, -180, -360],
                        scale: [1, 1.15, 1],
                    }}
                    transition={{
                        duration: 10 + i * 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.7,
                    }}
                />
            ))}

            {/* Bright floating particles */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={`particle-${i}`}
                    className="absolute w-2 h-2 bg-white/60 rounded-full"
                    style={{
                        left: `${10 + i * 8}%`,
                        top: `${15 + (i % 5) * 15}%`,
                        boxShadow: '0 0 15px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.4)',
                    }}
                    animate={{
                        y: [0, -60 - (i % 3) * 20, 0],
                        opacity: [0.6, 1, 0.6],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: 4 + (i % 4) * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.2,
                    }}
                />
            ))}

            {/* Content */}
            <div className="relative z-10 section-container text-center pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Main title with STRONG gradient */}
                    <motion.h1
                        className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 30%, #d0d0d0 60%, #b0b0b0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 0 40px rgba(255,255,255,0.4))',
                            letterSpacing: '0.02em',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        BLACK HEALTH<br />INTELLIGENCE
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        className="text-xl md:text-2xl text-silver-200 mb-12 font-light tracking-wide"
                        style={{
                            filter: 'drop-shadow(0 0 20px rgba(200,200,200,0.5))',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Building the Future of Healthcare Technology
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <button
                            className="px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-lg font-medium text-sm tracking-wider hover:bg-white/10 hover:border-white/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                        >
                            LEARN MORE
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
