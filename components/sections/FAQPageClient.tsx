'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
    question: string
    answer: string
    category?: string
}

const faqData: FAQItem[] = [
    {
        category: 'General',
        question: 'What is Black Health Intelligence?',
        answer: 'Black Health Intelligence is an innovation company focused on building health-related and non-health-related SaaS products. We combine clinical expertise with modern technology to create solutions that improve healthcare delivery and business operations.'
    },
    {
        category: 'General',
        question: 'Who is behind Black Health Intelligence?',
        answer: 'Black Health Intelligence was founded by a healthcare professional with extensive experience in clinical practice and a passion for technology. Our team combines medical expertise with software development skills to create meaningful products.'
    },
    {
        category: 'Products',
        question: 'What types of products do you build?',
        answer: 'We build a range of products including clinical practice management tools, health-related SaaS applications, and non-health-related software solutions. Each product is designed to solve real-world problems with elegant, user-friendly interfaces.'
    },
    {
        category: 'Products',
        question: 'Are your products available for purchase?',
        answer: 'Some of our products are available for sale or investment. Look for the "For Sale" or "Seeking Partners" badges on our Platform page. You can enquire about any product directly through the contact form on each project card.'
    },
    {
        category: 'Partnership',
        question: 'How can I partner with Black Health Intelligence?',
        answer: 'We are always open to partnerships and collaborations. Whether you are interested in investing, acquiring a product, or collaborating on a new venture, please reach out through our contact form or look for projects marked as "Seeking Partners".'
    },
    {
        category: 'Partnership',
        question: 'Do you offer custom development services?',
        answer: 'While our primary focus is on our own product portfolio, we may consider custom development projects that align with our expertise in healthcare and technology. Contact us to discuss your specific needs.'
    },
    {
        category: 'Technical',
        question: 'What technologies do you use?',
        answer: 'We primarily use modern web technologies including Next.js, React, TypeScript, and Supabase. Our products are built with a focus on performance, security, and user experience. Each project page includes detailed build information.'
    },
    {
        category: 'Technical',
        question: 'How do you ensure data security and privacy?',
        answer: 'Security and privacy are paramount, especially for health-related applications. We follow industry best practices, use secure authentication, encrypt sensitive data, and comply with relevant regulations including Australian privacy laws.'
    },
    {
        category: 'Contact',
        question: 'How can I get in touch?',
        answer: 'You can reach us through the contact form on our website, or email us directly at office@blackhealthintelligence.com. For specific project enquiries, use the contact button on individual project cards.'
    },
    {
        category: 'Contact',
        question: 'Where is Black Health Intelligence based?',
        answer: 'Black Health Intelligence Pty Ltd is based in Australia. We serve both local Australian markets and international clients depending on the product.'
    },
]

function FAQAccordion({ item, isOpen, onToggle, index }: { 
    item: FAQItem
    isOpen: boolean
    onToggle: () => void
    index: number
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="border border-white/10 bg-white/5 backdrop-blur-md mb-3 overflow-hidden"
        >
            <button
                onClick={onToggle}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <span className="text-lg font-medium text-white pr-4">{item.question}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                >
                    <ChevronDown className="w-5 h-5 text-silver-400" />
                </motion.div>
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="px-6 pb-5 text-silver-300 leading-relaxed border-t border-white/5 pt-4">
                            {item.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default function FAQPageClient() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)
    const [selectedCategory, setSelectedCategory] = useState<string>('All')

    const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category).filter(Boolean)))]
    
    const filteredFAQ = selectedCategory === 'All' 
        ? faqData 
        : faqData.filter(item => item.category === selectedCategory)

    return (
        <div className="pt-32 pb-20 relative z-10 section-container">
            {/* Hero Section */}
            <div className="text-center mb-16">
                <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="heading-chrome text-5xl md:text-6xl lg:text-7xl mb-6"
                >
                    Frequently Asked Questions
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-xl text-silver-400 max-w-2xl mx-auto"
                >
                    Find answers to common questions about Black Health Intelligence, our products, and how we work.
                </motion.p>
            </div>

            {/* Category Filter */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap justify-center gap-3 mb-12"
            >
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category as string)}
                        className={`px-5 py-2 text-sm font-medium tracking-wide uppercase border transition-all ${
                            selectedCategory === category
                                ? 'bg-white/10 border-white/30 text-white'
                                : 'bg-transparent border-white/10 text-silver-400 hover:border-white/20 hover:text-white'
                        }`}
                    >
                        {category}
                    </button>
                ))}
            </motion.div>

            {/* FAQ Accordion */}
            <div className="max-w-3xl mx-auto">
                {filteredFAQ.map((item, index) => (
                    <FAQAccordion
                        key={index}
                        item={item}
                        isOpen={openIndex === index}
                        onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                        index={index}
                    />
                ))}
            </div>

            {/* Contact CTA */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mt-20 text-center"
            >
                <div className="bg-white/5 border border-white/10 backdrop-blur-md p-10 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-4">Still have questions?</h2>
                    <p className="text-silver-400 mb-6">
                        Can&apos;t find what you&apos;re looking for? Get in touch and we&apos;ll be happy to help.
                    </p>
                    <a
                        href="/#contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors"
                    >
                        Contact Us
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>
                </div>
            </motion.div>
        </div>
    )
}

