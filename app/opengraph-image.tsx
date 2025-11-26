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
                    backgroundImage: 'linear-gradient(135deg, #050505 0%, #1a1a1a 50%, #050505 100%)',
                }}
            >
                {/* Decorative elements - metallic/silver tones */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(192, 192, 192, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
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

                    {/* Title - metallic silver */}
                    <div
                        style={{
                            fontSize: 64,
                            fontWeight: 700,
                            color: '#e0e0e0',
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
                            color: 'rgba(192, 192, 192, 0.8)',
                            textAlign: 'center',
                            display: 'flex',
                        }}
                    >
                        Healthcare Innovation Portfolio
                    </div>

                    {/* Tagline - silver/gray */}
                    <div
                        style={{
                            fontSize: 20,
                            color: '#a0a0a0',
                            textAlign: 'center',
                            marginTop: 24,
                            display: 'flex',
                        }}
                    >
                        PTY LTD
                    </div>
                </div>

                {/* Bottom border accent - metallic silver gradient */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, transparent, #c0c0c0, #ffffff, #c0c0c0, transparent)',
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

