'use client'

import { motion } from 'framer-motion'
import NeuralBackground from '@/components/ui/NeuralBackground'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050505]">
            {/* 1. Neural Network Background */}
            <NeuralBackground opacity={0.4} particleCount={100} />

            {/* Content */}
            <div className="relative z-10 section-container text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    {/* Main title with SHARP METALLIC GRADIENT */}
                    <motion.h1
                        className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight"
                        style={{
                            textShadow: '0 0 40px rgba(14, 165, 233, 0.15)'
                        }}
                    >
                        <span 
                            className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-silver-200 to-silver-500 mb-2 drop-shadow-sm"
                        >
                            BLACK HEALTH
                        </span>
                        <span 
                            className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-[var(--electric-blue)] to-[#003355]"
                            style={{ filter: 'drop-shadow(0 0 25px rgba(14, 165, 233, 0.4))' }}
                        >
                            INTELLIGENCE
                        </span>
                        <span className="block text-sm md:text-base tracking-[0.8em] text-white/70 uppercase mt-2">
                            Pty Ltd
                        </span>
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        className="text-lg md:text-xl text-silver-400 font-light tracking-[0.2em] uppercase mb-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Building the Future of Healthcare Innovation
                    </motion.p>

                    {/* CTA Button - Precision Metal Look */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <a
                            href="/platform"
                            className="inline-block px-10 py-4 bg-white/5 border border-white/20 text-white text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/10 hover:border-[var(--electric-blue)] hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-all duration-300 backdrop-blur-md"
                        >
                            Explore Platform
                        </a>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
