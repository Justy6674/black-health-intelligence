'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

type EnquiryModalProps = {
    open: boolean
    onClose: () => void
    projectName: string
}

function ModalContent({ onClose, projectName }: Omit<EnquiryModalProps, 'open'>) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/enquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    projectName,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to send enquiry')
            }

            setSuccess(true)
            setFormData({ name: '', email: '', message: '' })
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

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
                    maxWidth: '500px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    padding: '32px',
                    position: 'relative',
                    maxHeight: '90vh',
                    overflowY: 'auto',
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

                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            borderRadius: '50%', 
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <svg style={{ width: '32px', height: '32px', color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>
                            Enquiry Sent!
                        </h2>
                        <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>
                            Thank you for your interest in {projectName}. We&apos;ll be in touch soon.
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                borderRadius: '9999px',
                                marginBottom: '16px',
                            }}>
                                <svg style={{ width: '16px', height: '16px', color: '#eab308' }} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    For Sale
                                </span>
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                                Enquire About This Project
                            </h2>
                            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                                {projectName}
                            </p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div style={{ 
                                padding: '12px 16px', 
                                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                marginBottom: '20px',
                            }}>
                                <p style={{ fontSize: '14px', color: '#ef4444', margin: 0 }}>{error}</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#d1d5db', marginBottom: '8px' }}>
                                    Your Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                    placeholder="John Smith"
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#d1d5db', marginBottom: '8px' }}>
                                    Your Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                    }}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#d1d5db', marginBottom: '8px' }}>
                                    Your Message *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        resize: 'vertical',
                                    }}
                                    placeholder="I'm interested in this project and would like to know more about..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '14px 24px',
                                        backgroundColor: '#eab308',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: 'black',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                    }}
                                >
                                    {loading ? 'Sending...' : 'Send Enquiry'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    style={{
                                        padding: '14px 24px',
                                        backgroundColor: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: '#9ca3af',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default function EnquiryModal({ open, onClose, projectName }: EnquiryModalProps) {
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
        <ModalContent onClose={onClose} projectName={projectName} />,
        document.body
    )
}

