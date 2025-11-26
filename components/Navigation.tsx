'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PartnerLoginModal from '@/components/modals/PartnerLoginModal'

export default function Navigation() {
    const pathname = usePathname()
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)

    const isActive = (path: string) => pathname === path

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-5">
                <div className="flex items-center justify-between">
                    {/* Left: Utility Icons (Mockup Style) */}
                    <div className="flex items-center gap-6">
                        <button className="md:hidden text-silver-400 hover:text-white transition-colors group">
                            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <Link href="/" className="text-silver-400 hover:text-white transition-colors group">
                            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                        </Link>
                        <Link
                            href="/"
                            aria-label="Black Health Intelligence home"
                            className="inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 transition-transform hover:scale-[1.04]"
                        >
                            <Image
                                src="/LOGO.png"
                                alt="Black Health Intelligence logo"
                                width={72}
                                height={72}
                                priority
                            />
                        </Link>
                    </div>

                    {/* Right: Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link 
                            href="/solutions" 
                            className={`text-xs font-medium tracking-[0.2em] uppercase transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] ${isActive('/solutions') ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-silver-400'}`}
                        >
                            Solutions
                        </Link>
                        <Link 
                            href="/platform" 
                            className={`text-xs font-medium tracking-[0.2em] uppercase transition-all hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] ${isActive('/platform') ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-silver-400'}`}
                        >
                            Platform
                        </Link>
                        <Link 
                            href="/#about" 
                            className="text-silver-400 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                        >
                            About
                        </Link>
                        <Link 
                            href="/#contact" 
                            className="text-silver-400 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                        >
                            Contact
                        </Link>
                        <button
                            onClick={() => setIsPartnerModalOpen(true)}
                            className="text-xs font-semibold tracking-[0.25em] uppercase px-4 py-2 border border-white/30 rounded-full text-white hover:border-[var(--electric-blue)] hover:text-[var(--electric-blue)] hover:shadow-[0_0_18px_rgba(14,165,233,0.35)] transition-all"
                        >
                            Partner Login
                        </button>
                    </div>
                </div>
            </div>
            <PartnerLoginModal
                open={isPartnerModalOpen}
                onClose={() => setIsPartnerModalOpen(false)}
            />
        </nav>
    )
}
