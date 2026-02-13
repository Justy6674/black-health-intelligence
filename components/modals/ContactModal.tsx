'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ContactModalProps {
    open: boolean
    onClose: () => void
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
    const modalRef = useRef<Element | null>(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        modalRef.current = document.body
    }, [])

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
            // Reset form when opening
            setName('')
            setEmail('')
            setMessage('')
            setLoading(false)
            setStatus('idle')
            setErrorMessage('')
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatus('idle')
        setErrorMessage('')

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, message }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send message.')
            }

            setStatus('success')
        } catch (error: any) {
            setStatus('error')
            setErrorMessage(error.message || 'An unexpected error occurred.')
            console.error('Contact submission error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!open || !modalRef.current) return null

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(5px)',
                padding: '1rem',
                overflowY: 'auto',
            }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '600px',
                    borderRadius: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(5, 5, 5, 0.95)',
                    padding: '2rem',
                    boxShadow: '0 0 45px rgba(14, 165, 233, 0.3)',
                    zIndex: 99999,
                    margin: 'auto',
                    marginTop: '6rem',
                    marginBottom: '2rem',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label="Close contact modal"
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '1rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        transitionProperty: 'color',
                        transitionDuration: '150ms',
                        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                        fontSize: '1.5rem',
                        lineHeight: '1',
                    }}
                >
                    <X className="w-6 h-6" />
                </button>

                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <h2 style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: '600', color: 'white', letterSpacing: '0.05em' }}>
                        Get in Touch
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(192, 192, 192, 0.8)', marginTop: '0.5rem' }}>
                        Send us a message and we&apos;ll get back to you shortly.
                    </p>
                </div>

                {status === 'success' ? (
                    <div className="text-center p-8 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-green-400 text-lg font-semibold mb-4">Message Sent!</p>
                        <p className="text-green-200">Thank you for reaching out. We&apos;ll be in touch soon.</p>
                        <button onClick={onClose} className="mt-6 btn-primary">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'error' && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm">{errorMessage}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="contact-name" className="block text-sm font-medium text-silver-300 mb-2">Your Name</label>
                            <input
                                type="text"
                                id="contact-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label htmlFor="contact-email" className="block text-sm font-medium text-silver-300 mb-2">Your Email</label>
                            <input
                                type="email"
                                id="contact-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label htmlFor="contact-message" className="block text-sm font-medium text-silver-300 mb-2">Your Message</label>
                            <textarea
                                id="contact-message"
                                rows={5}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none"
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                )}
            </div>
        </div>,
        modalRef.current
    )
}


