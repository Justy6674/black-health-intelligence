export default function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-deep-black/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="text-xl font-bold bg-gradient-to-r from-white to-silver-300 bg-clip-text text-transparent">
                        BLACK HEALTH INTELLIGENCE
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#solutions" className="text-silver-300 hover:text-white transition-colors text-sm font-medium tracking-wide">
                            SOLUTIONS
                        </a>
                        <a href="#platform" className="text-silver-300 hover:text-white transition-colors text-sm font-medium tracking-wide">
                            PLATFORM
                        </a>
                        <a href="#about" className="text-silver-300 hover:text-white transition-colors text-sm font-medium tracking-wide">
                            ABOUT
                        </a>
                        <a href="#contact" className="text-silver-300 hover:text-white transition-colors text-sm font-medium tracking-wide">
                            CONTACT
                        </a>
                    </div>

                    {/* Mobile menu button */}
                    <button className="md:hidden text-white">
                        <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </nav>
    )
}
