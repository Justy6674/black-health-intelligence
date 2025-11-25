'use client'

import Link from 'next/link'

type PartnerLoginModalProps = {
    open: boolean
    onClose: () => void
}

export default function PartnerLoginModal({ open, onClose }: PartnerLoginModalProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#050505]/95 p-8 shadow-[0_0_45px_rgba(14,165,233,0.3)]">
                <button
                    onClick={onClose}
                    aria-label="Close partner login modal"
                    className="absolute right-4 top-4 text-white/60 hover:text-white transition-colors"
                >
                    ×
                </button>
                <div className="mb-6 text-center">
                    <p className="text-xs uppercase tracking-[0.6em] text-white/60">Invited partners only</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white tracking-[0.4em]">Partner Login</h2>
                </div>
                <p className="text-sm text-silver-300 mb-6 text-center">
                    Access is limited to partners we&apos;ve invited. Please reference the credentials below or contact us for support.
                </p>
                <div className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-1">Email</p>
                        <code className="w-full rounded-xl bg-black/70 px-4 py-2 text-white font-mono text-sm block">
                            downscaleweightloss@gmail.com
                        </code>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-1">Password</p>
                        <code className="w-full rounded-xl bg-black/70 px-4 py-2 text-white font-mono text-sm block">
                            IloveBB0307$$
                        </code>
                    </div>
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/admin/login"
                        className="text-center flex-1 rounded-full border border-[var(--electric-blue)] px-6 py-3 text-xs font-bold uppercase tracking-[0.35em] text-white hover:bg-[var(--electric-blue)]/20 transition-colors"
                    >
                        Open Admin Portal
                    </Link>
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white hover:border-white/40 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

