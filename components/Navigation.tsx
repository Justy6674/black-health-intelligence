'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
    const pathname = usePathname()

    const isActive = (path: string) => pathname === path

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between gap-6">
                    <Link
                        href="/"
                        className="flex items-center gap-4 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                        aria-label="Back to Black Health Intelligence home"
                    >
                        <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                            <Image
                                src="/logo-mark.svg"
                                alt="Black Health Intelligence monogram"
                                width={48}
                                height={48}
                                priority
                                className="drop-shadow-[0_0_12px_rgba(109,144,255,0.45)]"
                            />
                        </span>
                        <Image
                            src="/wordmark.svg"
                            alt="Black Health Intelligence wordmark"
                            width={150}
                            height={150}
                            priority
                            className="hidden sm:block w-auto h-12"
                        />
                        <span className="sm:hidden text-xs font-bold tracking-[0.3em] uppercase text-white">
                            Black Health
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-12">
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
                    </div>
                </div>
            </div>
        </nav>
    )
}
