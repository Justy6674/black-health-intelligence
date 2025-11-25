'use client'

import { motion } from 'framer-motion'

export default function About() {
    return (
        <section className="section-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl mx-auto"
            >
                {/* Section header */}
                <div className="text-center mb-12">
                    <h2 className="heading-lg mb-6 bg-gradient-to-r from-white to-silver-300 bg-clip-text text-transparent inline-block">
                        About the Founder
                    </h2>
                    <div className="w-24 h-1 bg-gradient-to-r from-transparent via-metallic to-transparent mx-auto mb-8"></div>
                </div>

                {/* Content */}
                <div
                    className="p-8 rounded-xl border-2 border-silver-700/30 shadow-lg hover:border-silver-500/50 hover:shadow-[0_0_30px_rgba(192,192,192,0.1)] transition-all duration-300"
                    style={{
                        background: 'linear-gradient(135deg, rgba(26,26,26,0.8) 0%, rgba(15,15,15,0.8) 100%)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-silver-300 leading-relaxed mb-6">
                            Black Health Intelligence is a healthcare innovation portfolio founded by a Nurse Practitioner
                            with a passion for transforming healthcare delivery through technology and clinical excellence.
                        </p>

                        <p className="text-lg text-silver-300 leading-relaxed mb-6">
                            With a unique blend of clinical expertise and technological innovation, we build solutions
                            that address real-world healthcare challenges—from direct patient care through our clinical
                            practice to scalable SaaS platforms that empower healthcare providers worldwide.
                        </p>

                        <div className="mt-8 pt-8 border-t border-silver-700/30">
                            <h3 className="text-xl font-bold text-white mb-4">Our Mission</h3>
                            <p className="text-silver-300 leading-relaxed">
                                To bridge the gap between clinical practice and technology, creating innovative healthcare
                                solutions that improve patient outcomes, enhance provider efficiency, and make quality
                                healthcare more accessible to all.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}
