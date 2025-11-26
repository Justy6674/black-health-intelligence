'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type PartnerLoginModalProps = {
    open: boolean
    onClose: () => void
}

function ModalContent({ onClose }: { onClose: () => void }) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    padding: '32px',
                    position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        fontSize: '24px',
                        cursor: 'pointer',
                    }}
                >
                    ×
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        Partner Portal
                    </h2>
                    <p style={{ fontSize: '14px', color: '#9ca3af' }}>Invited partners only</p>
                </div>

                {/* Message */}
                <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                }}>
                    <p style={{ fontSize: '14px', color: '#d1d5db', textAlign: 'center', lineHeight: '1.6' }}>
                        Access to the partner portal is by invitation only. If you are an existing partner, please use the credentials provided to you directly.
                    </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Link
                        href="/admin/login"
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'center',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'white',
                            textDecoration: 'none',
                        }}
                    >
                        Go to Login
                    </Link>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            backgroundColor: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '14px',
                            color: '#9ca3af',
                            cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function PartnerLoginModal({ open, onClose }: PartnerLoginModalProps) {
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
    
    if (typeof window === 'undefined') return null

    return createPortal(
        <ModalContent onClose={onClose} />,
        document.body
    )
}
