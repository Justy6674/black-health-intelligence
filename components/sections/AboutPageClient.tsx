'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import ContactModal from '@/components/modals/ContactModal'

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
}

const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } }
}

export default function AboutPageClient() {
    const [contactOpen, setContactOpen] = useState(false)

    return (
        <>
            <div className="pt-32 pb-20 relative z-10 section-container">
                {/* Header */}
                <motion.div 
                    className="mb-20 relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/50"></div>
                    <h1 className="heading-chrome text-4xl md:text-6xl mb-6 pl-6">
                        ABOUT US
                    </h1>
                    <p className="text-yellow-200/60 max-w-3xl text-lg pl-6 border-l border-yellow-500/20">
                        The story behind Black Health Intelligence — from clinical practice to innovation lab.
                    </p>
                </motion.div>

                {/* Section 1: About Justin Black */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-3xl md:text-4xl mb-6">
                            About Justin Black
                        </h2>
                        <p className="text-lg text-yellow-300/80 mb-4 font-semibold">
                            Nurse Practitioner &amp; Health-Tech Founder
                        </p>
                        <p className="text-yellow-200/70 text-lg leading-relaxed max-w-4xl">
                            Justin Black is an AHPRA-endorsed Nurse Practitioner with formal qualifications in Nurse Practitioner practice, intensive care, emergency/acute care, paediatrics, radiology interpretation, obesity medicine, and health promotion. His clinical work is grounded in safe, evidence-based practice and more than two decades of experience across Australia.
                        </p>
                    </div>
                </motion.section>

                {/* Section 2: Formal Education */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            Formal Education
                        </h2>
                        <p className="text-yellow-200/60 mb-6 text-sm uppercase tracking-wider">Qualifications Only</p>
                        
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span><strong className="text-yellow-100">Master of Nursing Science (Nurse Practitioner)</strong> — QUT</span>
                            </li>
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span><strong className="text-yellow-100">Postgraduate Certificate of Nursing Science (Intensive Care)</strong> — JCU</span>
                            </li>
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span><strong className="text-yellow-100">Graduate Certificate of Health Promotion</strong> — ECU</span>
                            </li>
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span><strong className="text-yellow-100">Bachelor of Science (Nursing)</strong> — Curtin University</span>
                            </li>
                        </ul>
                        
                        <p className="text-yellow-200/60 text-sm leading-relaxed max-w-4xl">
                            Extensive professional development in obesity management, emergency, paediatrics, ALS/PALS, disaster response, radiology interpretation, dermatology, simulation, prescribing, and clinical leadership. These qualifications determine Justin&apos;s regulated scope of practice under AHPRA and the NMBA.
                        </p>
                    </div>
                </motion.section>

                {/* Section 3: Professional Experience */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            Professional Experience
                        </h2>
                        <p className="text-yellow-200/60 mb-6 text-sm uppercase tracking-wider">Separate to Qualifications</p>
                        
                        <p className="text-yellow-200/70 mb-6">
                            Justin has <strong className="text-yellow-100">25+ years of clinical experience</strong> across:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                            {[
                                'Emergency & Resuscitation',
                                'Paediatric Emergency',
                                'Coronary Care & Cardiothoracics',
                                'ICU & High Acuity Care',
                                'General Practice',
                                'Virtual ED & Telehealth',
                                'Medical Weight Management',
                                'Disaster Response & AUSMAT',
                                'Leadership roles (NUM, Clinical Facilitator, Clinical Director, Educator)'
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-yellow-200/70 text-sm">
                                    <span className="w-2 h-2 bg-yellow-500/50 rounded-full"></span>
                                    {item}
                                </div>
                            ))}
                        </div>
                        
                        <p className="text-yellow-200/70 leading-relaxed max-w-4xl">
                            He has provided care in hospitals, GP clinics, urgent care, community settings, and modern telehealth models. His approach combines physiology, empathy, accountability, and long-term thinking—especially in obesity care, where weight regain is biological, not personal failure.
                        </p>
                    </div>
                </motion.section>

                {/* Section 4: Downscale Weight Loss Clinic */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-4">
                            Downscale Weight Loss Clinic
                        </h2>
                        <p className="text-yellow-300/80 mb-6 font-semibold">
                            Who We Are &amp; What We Solve
                        </p>
                        
                        <p className="text-yellow-200/70 mb-8 leading-relaxed max-w-4xl">
                            Downscale was built as a small, family-run clinic deliberately designed to be the opposite of high-volume, impersonal weight-loss services.
                        </p>
                        
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-6 mb-8">
                            <h3 className="text-xl font-bold text-yellow-100 mb-4">The Problem We Solve</h3>
                            <p className="text-yellow-200/70 leading-relaxed">
                                Australian weight-loss care is often rushed, transactional, and overly focused on short-term outcomes. Many clinics don&apos;t acknowledge that weight regain is normal human physiology — not a moral failing. This leaves patients unsupported and trapped in a cycle they blame themselves for.
                            </p>
                        </div>
                        
                        <h3 className="text-xl font-bold text-yellow-100 mb-6">Our Approach — The Four Pillars</h3>
                        
                        <motion.div 
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            variants={staggerContainer}
                            initial="initial"
                            whileInView="whileInView"
                            viewport={{ once: true }}
                        >
                            {[
                                {
                                    title: '1. Clinical & Medication Support',
                                    desc: 'Safer prescribing, close follow-up, side effect management, and realistic expectations.'
                                },
                                {
                                    title: '2. Nutrition',
                                    desc: 'Protein-forward, simple, sustainable eating that works with human physiology.'
                                },
                                {
                                    title: '3. Activity',
                                    desc: 'Muscle-first, realistic, non-intimidating, and tailored for everyday life.'
                                },
                                {
                                    title: '4. Mental Health & Sleep',
                                    desc: 'Stress, shame, poor sleep and burnout derail weight loss—so we address them, without judgement.'
                                }
                            ].map((pillar, i) => (
                                <motion.div 
                                    key={i}
                                    className="bg-white/5 border border-yellow-500/20 rounded-lg p-5 hover:border-yellow-500/40 transition-colors"
                                    variants={{
                                        initial: { opacity: 0, y: 20 },
                                        whileInView: { opacity: 1, y: 0 }
                                    }}
                                >
                                    <h4 className="font-bold text-yellow-100 mb-2">{pillar.title}</h4>
                                    <p className="text-yellow-200/60 text-sm">{pillar.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                        
                        <p className="text-yellow-200/60 mt-6 text-sm">
                            This model reflects Justin&apos;s clinical expertise and the couple&apos;s commitment to genuinely personalised care.
                        </p>
                    </div>
                </motion.section>

                {/* Section 5: About Bec */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-4">
                            About Bec
                        </h2>
                        <p className="text-yellow-300/80 mb-6 font-semibold">
                            RN, Co-Founder &amp; Patient Experience Lead
                        </p>
                        
                        <p className="text-yellow-200/70 mb-6 leading-relaxed max-w-4xl">
                            Bec is an experienced Registered Nurse with a background in:
                        </p>
                        
                        <div className="flex flex-wrap gap-3 mb-6">
                            {['Emergency', 'Coronary care', 'Weight management', 'Patient education', 'Clinical support', 'Social media design', 'Health communication'].map((skill, i) => (
                                <span key={i} className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-200/80 text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                        
                        <p className="text-yellow-200/70 leading-relaxed max-w-4xl mb-4">
                            She handles patient experience, education, content, and the &quot;human side&quot; of every product the couple builds. Bec ensures everything—clinical, technical, or creative—feels accessible, kind, and supportive.
                        </p>
                        
                        <p className="text-yellow-200/60 text-sm italic">
                            Together, Justin and Bec run a modern health clinic while raising five children and building a growing portfolio of problem-solving tech projects.
                        </p>
                    </div>
                </motion.section>

                {/* Section 6: The Eclectic Skillset */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            The Eclectic Skillset
                        </h2>
                        <p className="text-yellow-300/80 mb-6 font-semibold">
                            What Makes Us Different
                        </p>
                        
                        <p className="text-yellow-200/70 mb-8 leading-relaxed max-w-4xl">
                            Between Justin&apos;s clinical background and Bec&apos;s patient-experience, communication, and design expertise, we bring one of the most eclectic and effective skillsets in the health-tech space.
                        </p>
                        
                        <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 pl-6 py-4 mb-8">
                            <p className="text-xl text-yellow-100 font-bold mb-2">Our Philosophy</p>
                            <p className="text-yellow-200/80 text-lg italic">
                                &quot;We don&apos;t work around problems — we build the solution.&quot;
                            </p>
                        </div>
                        
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span>If a barrier exists, we design the tool that removes it.</span>
                            </li>
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span>If a process is broken, we fix it instead of tolerating it.</span>
                            </li>
                            <li className="flex items-start gap-3 text-yellow-200/70">
                                <span className="text-yellow-500 mt-1">▸</span>
                                <span>If patients are confused, overwhelmed, or unsupported, we build clarity and structure.</span>
                            </li>
                        </ul>
                        
                        <p className="text-yellow-200/60 mt-6">
                            We are constantly building, exploring, questioning, testing, and creating — both inside healthcare and outside it. Because sometimes the best ideas come from the things you obsess over in real life.
                        </p>
                    </div>
                </motion.section>

                {/* Section 7: Why We Build Beyond Health */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            Why We Build Beyond Health
                        </h2>
                        
                        <p className="text-yellow-200/70 mb-8 leading-relaxed max-w-4xl">
                            Alongside Downscale and our clinical platforms, we also create non-health SaaS products based on our passions, hobbies, and money-eating obsessions, including:
                        </p>
                        
                        <div className="bg-white/5 border border-yellow-500/20 rounded-lg p-6 mb-6">
                            <h3 className="text-xl font-bold text-yellow-100 mb-2">ScentSwap</h3>
                            <p className="text-yellow-300/80 mb-3">Australia&apos;s first AI-powered fragrance bartering marketplace.</p>
                            <p className="text-yellow-200/60 text-sm">
                                For perfume lovers who want to trade safely, fairly, and without scammers.
                            </p>
                        </div>
                        
                        <p className="text-yellow-200/60 text-sm italic">
                            These side projects exist because creativity doesn&apos;t fit neatly into one industry—we follow the ideas worth building.
                        </p>
                    </div>
                </motion.section>

                {/* Section 8: Black Health Intelligence Pty Ltd */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            Black Health Intelligence Pty Ltd
                        </h2>
                        
                        <p className="text-yellow-200/70 mb-6">
                            This is our umbrella company for:
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                            {[
                                'Clinical services',
                                'Telehealth tools',
                                'Patient-support software',
                                'Compliance and audit solutions (e.g., TeleCheck)',
                                'AI-driven weight-management apps',
                                'Micro-SaaS projects like ScentSwap',
                                'Future ventures across health and non-health sectors'
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-yellow-200/70 text-sm">
                                    <span className="w-2 h-2 bg-yellow-500/50 rounded-full"></span>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* Section 9: Our Mission */}
                <motion.section 
                    className="mb-20 relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/30"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            Our Mission
                        </h2>
                        
                        <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 pl-6 py-4">
                            <p className="text-xl text-yellow-100 leading-relaxed">
                                To make healthcare more personal, intelligent, and human—while also building tools that reflect our actual lives, passions, and obsessions.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Section 10: Our Invite (CTA) */}
                <motion.section 
                    className="relative"
                    {...fadeInUp}
                >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-yellow-500/50"></div>
                    <div className="pl-8">
                        <h2 className="heading-chrome text-2xl md:text-3xl mb-6">
                            Our Invite
                        </h2>
                        
                        <p className="text-yellow-200/70 mb-8 text-lg leading-relaxed max-w-3xl">
                            Follow along for this skilled, eclectic, fast-moving building journey.
                        </p>
                        
                        <div className="flex flex-wrap gap-4 mb-8">
                            <span className="text-yellow-100 font-semibold">Collaborate with us.</span>
                            <span className="text-yellow-100 font-semibold">Partner with us.</span>
                            <span className="text-yellow-100 font-semibold">Invest with us.</span>
                        </div>
                        
                        <p className="text-yellow-300/80 mb-8 text-lg">
                            And if you&apos;re brave enough?
                        </p>
                        
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => setContactOpen(true)}
                                className="px-8 py-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
                            >
                                Contact Us
                            </button>
                            <button
                                onClick={() => setContactOpen(true)}
                                className="px-8 py-4 bg-transparent border-2 border-yellow-500 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/10 transition-colors"
                            >
                                Challenge Us
                            </button>
                            <button
                                onClick={() => setContactOpen(true)}
                                className="px-8 py-4 bg-transparent border-2 border-yellow-500 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500/10 transition-colors"
                            >
                                Build With Us
                            </button>
                        </div>
                    </div>
                </motion.section>
            </div>

            {/* Contact Modal */}
            <ContactModal 
                isOpen={contactOpen} 
                onClose={() => setContactOpen(false)} 
            />
        </>
    )
}

