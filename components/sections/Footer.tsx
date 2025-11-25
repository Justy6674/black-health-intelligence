export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-charcoal border-t border-silver-700/30">
            <div className="section-container py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div>
                        <h3 className="text-xl font-bold text-gradient mb-3">
                            Black Health Intelligence
                        </h3>
                        <p className="text-silver-400 text-sm">
                            Building the future of healthcare technology
                        </p>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-semibold mb-3">Contact</h4>
                        <div className="space-y-2 text-silver-400 text-sm">
                            <p>
                                <a
                                    href="mailto:contact@blackhealthintelligence.com"
                                    className="hover:text-metallic transition-colors"
                                >
                                    contact@blackhealthintelligence.com
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-semibold mb-3">Legal</h4>
                        <p className="text-silver-400 text-sm">
                            Black Health Intelligence PTY LTD
                        </p>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 border-t border-silver-700/30 text-center">
                    <p className="text-silver-500 text-sm">
                        © {currentYear} Black Health Intelligence PTY LTD. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
