'use client'

import { motion } from 'framer-motion'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-deep-black">
            {/* Subtle animated gradient background */}
            <div className="absolute inset-0 bg-deep-black">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_rgba(14,165,233,0.15),transparent_50%)]" />
                <div className="absolute top-0 left-0 right-0 h-[500px] opacity-10 bg-[linear-gradient(to_bottom,_rgba(14,165,233,0.2),transparent)]" />
            </div>

            {/* Modern technical grid overlay */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                }}
            />

            {/* Content */}
            <div className="relative z-10 section-container text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    {/* Main title */}
                    <motion.h1
                        className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight tracking-tight"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                            BLACK HEALTH
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-[var(--electric-blue)] to-white">
                            INTELLIGENCE
                        </span>
                    </motion.h1>

                    {/* Tagline */}
                    <motion.div
                        className="flex flex-col items-center gap-4 mb-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <div className="h-[1px] w-24 bg-[var(--electric-blue)] opacity-50" />
                        <p className="text-xl md:text-2xl text-gray-400 font-light tracking-wide max-w-2xl mx-auto">
                            Building the Future of Healthcare Technology
                        </p>
                        <div className="h-[1px] w-24 bg-[var(--electric-blue)] opacity-50" />
                    </motion.div>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        <button
                            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg transition-all duration-300"
                        >
                            <div className="absolute inset-0 border border-[var(--electric-blue)]/30 rounded-lg group-hover:border-[var(--electric-blue)] transition-colors duration-300" />
                            <div className="absolute inset-0 bg-[var(--electric-blue)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 shadow-[0_0_30px_rgba(14,165,233,0.2)] transition-opacity duration-300" />
                            
                            <span className="relative font-medium text-sm tracking-widest text-[var(--electric-blue)] group-hover:text-white transition-colors duration-300 uppercase">
                                Learn More
                            </span>
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
