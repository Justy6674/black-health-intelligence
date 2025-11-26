import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { name, email, message, projectName } = await request.json()

        // Validate required fields
        if (!name || !email || !message || !projectName) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            )
        }

        const resendApiKey = process.env.RESEND_API_KEY
        if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured')
            return NextResponse.json(
                { error: 'Email service not configured' },
                { status: 500 }
            )
        }

        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'Black Health Intelligence <noreply@blackhealthintelligence.com>',
                to: ['office@blackhealthintelligence.com'],
                reply_to: email,
                subject: `Project Enquiry: ${projectName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
                            New Project Enquiry
                        </h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${projectName}</p>
                            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${name}</p>
                            <p style="margin: 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        </div>
                        
                        <h3 style="color: #333;">Message:</h3>
                        <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                        
                        <p style="color: #666; font-size: 12px;">
                            This enquiry was submitted via the Black Health Intelligence portfolio website.
                        </p>
                    </div>
                `,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('Resend API error:', error)
            return NextResponse.json(
                { error: 'Failed to send email' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Enquiry error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

