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
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-24 pb-8 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-md rounded-2xl border border-white/20 bg-[#0a0a0a] p-8 shadow-2xl my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    aria-label="Close modal"
                    className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors text-2xl leading-none"
                >
                    ×
                </button>

                {/* Header */}
                <div className="mb-6 text-center pt-2">
                    <h2 className="text-xl font-bold text-white tracking-wide mb-2">Partner Portal</h2>
                    <p className="text-sm text-silver-400">Invited partners only</p>
                </div>

                {/* Message */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                    <p className="text-silver-300 text-sm leading-relaxed text-center">
                        Access to the partner portal is by invitation only. If you are an existing partner, please use the credentials provided to you directly.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <Link
                        href="/admin/login"
                        className="w-full text-center rounded-lg bg-white/10 border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                    >
                        Go to Login
                    </Link>
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg border border-white/10 px-6 py-3 text-sm text-silver-400 hover:text-white hover:border-white/20 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
