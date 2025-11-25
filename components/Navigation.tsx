export default function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 py-5">
                <div className="flex items-center justify-between">
                    {/* Left: Utility Icons (Mockup Style) */}
                    <div className="flex items-center gap-6">
                        <button className="text-silver-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <button className="text-silver-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                        </button>
                        <button className="text-silver-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </button>
                        <button className="text-silver-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    </div>

                    {/* Right: Navigation Links */}
                    <div className="hidden md:flex items-center gap-10">
                        <a href="#solutions" className="text-silver-400 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase">
                            Solutions
                        </a>
                        <a href="#platform" className="text-silver-400 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase">
                            Platform
                        </a>
                        <a href="#about" className="text-silver-400 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase">
                            About
                        </a>
                        <a href="#contact" className="text-silver-400 hover:text-white transition-colors text-xs font-medium tracking-[0.2em] uppercase">
                            Contact
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    )
}
