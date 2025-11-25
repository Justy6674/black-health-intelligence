'use client'

import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-deep-black">
            {/* MUCH MORE VISIBLE Animated background grid */}
            <div className="absolute inset-0">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                    }}
                ></div>
                {/* Radial fade */}
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-deep-black/30 to-deep-black"></div>
            </div>


            {/* MUCH LARGER Floating metallic orbs with STRONG glow */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
                style={{
                    background: 'radial-gradient(circle, rgba(200,200,200,0.25) 0%, rgba(150,150,150,0.15) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
                animate={{
                    y: [0, 60, 0],
                    x: [0, 40, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] rounded-full blur-3xl"
                style={{
                    background: 'radial-gradient(circle, rgba(100,120,150,0.3) 0%, rgba(51,65,85,0.2) 40%, transparent 70%)',
                    filter: 'blur(70px)',
                }}
                animate={{
                    y: [0, -70, 0],
                    x: [0, -50, 0],
                    scale: [1, 1.4, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* LARGER floating particles */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 bg-white/40 rounded-full"
                    style={{
                        left: `${15 + i * 12}%`,
                        top: `${25 + (i % 4) * 18}%`,
                        boxShadow: '0 0 10px rgba(255,255,255,0.5)',
                    }}
                    animate={{
                        y: [0, -40, 0],
                        opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                        duration: 3 + i * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.3,
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
                    {/* Logo/Wordmark with STRONG gradient and glow */}
                    <motion.h1
                        className="heading-xl mb-6 font-bold"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #a0a0a0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        Black Health Intelligence
                    </motion.h1>

                    {/* Tagline with strong glow */}
                    <motion.p
                        className="text-2xl md:text-3xl text-silver-200 mb-8 font-light"
                        style={{
                            filter: 'drop-shadow(0 0 15px rgba(200,200,200,0.4))',
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
