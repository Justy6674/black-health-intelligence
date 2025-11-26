'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

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
                    <h2 className="heading-chrome text-4xl md:text-6xl mb-10 inline-block">
                        What We Do And Why
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
                        <div className="space-y-4 mb-8">
                            <p className="text-xl text-white leading-relaxed">
                                <span className="text-[var(--electric-blue)] font-semibold">We care for patients</span> — because we&apos;re nurses first.
                            </p>
                            <p className="text-xl text-white leading-relaxed">
                                <span className="text-[var(--electric-blue)] font-semibold">We fix problems</span> — because we refuse to tolerate broken systems.
                            </p>
                            <p className="text-xl text-white leading-relaxed">
                                <span className="text-[var(--electric-blue)] font-semibold">We innovate</span> — because good ideas deserve to exist.
                            </p>
                            <p className="text-xl text-silver-300 leading-relaxed italic">
                                Then we do it all again.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-silver-700/30">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Patient Care</h4>
                                <p className="text-sm text-silver-400">
                                    Nurse-led clinical practice delivering real healthcare — not corporate medicine.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-2">Problem Solving</h4>
                                <p className="text-sm text-silver-400">
                                    Building SaaS tools that fix what&apos;s broken in healthcare systems.
                                </p>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-2">Innovation</h4>
                                <p className="text-sm text-silver-400">
                                    Creating solutions across health and beyond — because good ideas don&apos;t wait.
                                </p>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-10 pt-6 border-t border-silver-700/30 text-center">
                            <Link 
                                href="/platform"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--electric-blue)]/20 text-[var(--electric-blue)] border border-[var(--electric-blue)]/50 rounded-lg font-semibold hover:bg-[var(--electric-blue)]/30 hover:border-[var(--electric-blue)] transition-all duration-300"
                            >
                                Explore Our Portfolio
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    )
}
