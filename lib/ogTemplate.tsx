import React from 'react'

const baseFont = '"Space Grotesk", "Inter", "Arial Black", sans-serif'
const accent = '#6d90ff'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

const textGlow = {
    textShadow: '0 0 32px rgba(109, 144, 255, 0.45)',
}

export const OgTemplate = () => (
    <div
        style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            padding: '72px',
            backgroundColor: '#050505',
            color: '#f7f8ff',
            fontFamily: baseFont,
            letterSpacing: '-0.5px',
        }}
    >
        <div
            style={{
                position: 'absolute',
                inset: '-20%',
                background: 'radial-gradient(circle, rgba(109,144,255,0.5) 0%, rgba(5,5,5,0) 65%)',
                filter: 'blur(40px)',
                display: 'flex',
            }}
        />
        <div
            style={{
                position: 'absolute',
                inset: 0,
                background:
                    'linear-gradient(120deg, rgba(150,161,255,0.08) 0%, rgba(109,144,255,0.03) 35%, rgba(5,5,5,0.2) 100%)',
                mixBlendMode: 'screen',
                display: 'flex',
            }}
        />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '260px',
                    height: '260px',
                    position: 'relative',
                }}
            >
                <span
                    style={{
                        fontWeight: 900,
                        fontSize: '240px',
                        lineHeight: 0.9,
                        backgroundImage:
                            'linear-gradient(90deg,#f4f6f8 0%,#c8ccd4 45%,#7e8594 65%,#586070 100%), radial-gradient(circle at 85% 75%,rgba(32,181,255,0.9) 0%,rgba(12,120,255,0.85) 45%,rgba(4,22,64,0.75) 90%)',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        textShadow: '0 0 25px rgba(11,120,255,0.35)',
                        position: 'relative',
                        display: 'block',
                    }}
                >
                    B
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                    style={{
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        fontSize: '56px',
                        letterSpacing: '1.4rem',
                        ...textGlow,
                    }}
                >
                    BLACK
                </span>
                <span
                    style={{
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        fontSize: '30px',
                        letterSpacing: '1rem',
                        color: accent,
                        opacity: 0.9,
                    }}
                >
                    HEALTH INTELLIGENCE
                </span>
                <span
                    style={{
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        fontSize: '18px',
                        letterSpacing: '1.2rem',
                        color: '#b5bdff',
                    }}
                >
                    PTY LTD
                </span>
            </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ maxWidth: '60%', display: 'flex' }}>
                <p
                    style={{
                        fontSize: '30px',
                        lineHeight: 1.4,
                        color: '#d6dcff',
                    }}
                >
                    Medicare-compliant telehealth data, weight loss intelligence, and high-trust innovation across Australia&apos;s health sector.
                </p>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '8px',
                    color: '#8ea0ff',
                    fontSize: '20px',
                    letterSpacing: '0.3em',
                }}
            >
                <span>blackhealthintelligence.com</span>
                <span style={{ fontSize: '16px', color: '#6d90ff', letterSpacing: '0.4em' }}>Since 2025</span>
            </div>
        </div>
    </div>
)

