'use client'

import Link from 'next/link'
import { useEffect } from 'react'

type PartnerLoginModalProps = {
    open: boolean
    onClose: () => void
}

export default function PartnerLoginModal({ open, onClose }: PartnerLoginModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed top-0 left-0 right-0 bottom-0 bg-black/90 backdrop-blur-md"
                style={{ zIndex: 9998 }}
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Modal */}
            <div
                className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center p-6"
                style={{ zIndex: 9999 }}
                role="dialog"
                aria-modal="true"
            >
                <div 
                    className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0a0a0a] p-8 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors text-3xl leading-none"
                    >
                        ×
                    </button>

                    {/* Header */}
                    <div className="mb-6 text-center">
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
        </>
    )
}
