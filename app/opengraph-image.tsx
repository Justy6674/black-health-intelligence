import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Black Health Intelligence - Healthcare Innovation Portfolio'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
    // Fetch the logo from the public folder
    const logoUrl = 'https://blackhealthintelligence.com/LOGO.png'
    
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#050505',
                    backgroundImage: 'linear-gradient(135deg, #050505 0%, #0a1628 50%, #050505 100%)',
                }}
            >
                {/* Decorative elements */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)',
                        display: 'flex',
                    }}
                />
                
                {/* Main content */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                    }}
                >
                    {/* Actual Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={logoUrl}
                        alt="Black Health Intelligence Logo"
                        width={150}
                        height={150}
                        style={{
                            marginBottom: 30,
                        }}
                    />

                    {/* Title */}
                    <div
                        style={{
                            fontSize: 64,
                            fontWeight: 700,
                            color: 'white',
                            textAlign: 'center',
                            marginBottom: 16,
                            display: 'flex',
                        }}
                    >
                        Black Health Intelligence
                    </div>

                    {/* Subtitle */}
                    <div
                        style={{
                            fontSize: 28,
                            color: 'rgba(255, 255, 255, 0.7)',
                            textAlign: 'center',
                            display: 'flex',
                        }}
                    >
                        Healthcare Innovation Portfolio
                    </div>

                    {/* Tagline */}
                    <div
                        style={{
                            fontSize: 20,
                            color: '#0ea5e9',
                            textAlign: 'center',
                            marginTop: 24,
                            display: 'flex',
                        }}
                    >
                        PTY LTD
                    </div>
                </div>

                {/* Bottom border accent */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)',
                        display: 'flex',
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    )
}

