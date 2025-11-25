'use client'

import { motion } from 'framer-motion'

export default function About() {
    return (
        <section id="about" className="section-container scroll-mt-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl mx-auto"
            >
                {/* Section header */}
                <div className="text-center mb-12">
                    <h2 className="heading-lg mb-6 text-white inline-block">
                        About the Founder
                    </h2>
                    <div className="w-24 h-[1px] bg-[var(--electric-blue)] opacity-50 mx-auto mb-8"></div>
                </div>

                {/* Content */}
                <div
                    className="p-8 rounded-xl border border-white/10 shadow-lg hover:border-[var(--electric-blue)]/50 hover:shadow-[0_0_30px_rgba(14,165,233,0.1)] transition-all duration-300"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,0.8) 100%)',
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-silver-700/30">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Clinical Expertise</h4>
                                <p className="text-sm text-silver-400">
                                    Nurse Practitioner led care with focus on weight management and preventative health.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-2">Tech Innovation</h4>
                                <p className="text-sm text-silver-400">
                                    Full-stack development of SaaS platforms solving healthcare inefficiencies.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-2">Venture Building</h4>
                                <p className="text-sm text-silver-400">
                                    Creating and scaling sustainable healthcare businesses from concept to launch.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}
