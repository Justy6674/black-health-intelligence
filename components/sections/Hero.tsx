'use client'

import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 bg-deep-black">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-deep-black/50 to-deep-black"></div>
            </div>

            {/* Floating metallic orbs */}
            <motion.div
                className="absolute top-20 left-20 w-64 h-64 rounded-full bg-metallic-gradient opacity-10 blur-3xl"
                animate={{
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <motion.div
                className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent-gradient opacity-10 blur-3xl"
                animate={{
                    y: [0, -40, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Content */}
            <div className="relative z-10 section-container text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Logo/Wordmark */}
                    <motion.h1
                        className="heading-xl mb-6 text-gradient"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        Black Health Intelligence
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        className="text-2xl md:text-3xl text-silver-400 mb-8 font-light"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Building the Future of Healthcare Technology
                    </motion.p>

                    {/* Mission statement */}
                    <motion.p
                        className="text-lg md:text-xl text-silver-500 max-w-3xl mx-auto leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        A portfolio of innovative healthcare solutions, from clinical practice to cutting-edge health SaaS platforms,
                        designed to transform patient care and empower healthcare providers.
                    </motion.p>

                    {/* Scroll indicator */}
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
                                className="w-6 h-6 text-metallic mx-auto"
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
