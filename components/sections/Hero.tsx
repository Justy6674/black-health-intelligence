'use client'

import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-deep-black">
            {/* Animated background grid - more visible */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
            </div>

            {/* Floating metallic orbs with stronger glow */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
                style={{
                    background: 'radial-gradient(circle, rgba(192,192,192,0.4) 0%, rgba(192,192,192,0.1) 50%, transparent 100%)'
                }}
                animate={{
                    y: [0, 40, 0],
                    x: [0, 30, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
                style={{
                    background: 'radial-gradient(circle, rgba(51,65,85,0.6) 0%, rgba(51,65,85,0.2) 50%, transparent 100%)'
                }}
                animate={{
                    y: [0, -50, 0],
                    x: [0, -40, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Additional floating particles */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-metallic rounded-full opacity-30"
                    style={{
                        left: `${20 + i * 15}%`,
                        top: `${30 + (i % 3) * 20}%`,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 3 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.2,
                    }}
                />
            ))}

            {/* Content */}
            <div className="relative z-10 section-container text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Logo/Wordmark with enhanced gradient */}
                    <motion.h1
                        className="heading-xl mb-6 bg-gradient-to-br from-white via-silver-200 to-silver-400 bg-clip-text text-transparent font-bold"
                        style={{
                            textShadow: '0 0 40px rgba(255,255,255,0.1)',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        Black Health Intelligence
                    </motion.h1>

                    {/* Tagline with glow */}
                    <motion.p
                        className="text-2xl md:text-3xl text-silver-300 mb-8 font-light"
                        style={{
                            textShadow: '0 0 20px rgba(192,192,192,0.2)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Building the Future of Healthcare Technology
                    </motion.p>

                    {/* Mission statement */}
                    <motion.p
                        className="text-lg md:text-xl text-silver-400 max-w-3xl mx-auto leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        A portfolio of innovative healthcare solutions, from clinical practice to cutting-edge health SaaS platforms,
                        designed to transform patient care and empower healthcare providers.
                    </motion.p>

                    {/* Scroll indicator with glow */}
                    <motion.div
                        className="mt-16"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 1 }}
                    >
                        <motion.div
                            className="inline-block"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <svg
                                className="w-6 h-6 text-metallic mx-auto drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                            </svg>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
