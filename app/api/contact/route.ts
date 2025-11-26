import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const OFFICE_EMAIL = 'office@blackhealthintelligence.com'

export async function POST(request: NextRequest) {
    try {
        const { name, email, message } = await request.json()

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
        }

        // Send email to the business owner
        await resend.emails.send({
            from: `Contact Form <${OFFICE_EMAIL}>`,
            to: [OFFICE_EMAIL],
            reply_to: email,
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><em>This message was sent from the Black Health Intelligence website contact form.</em></p>
            `,
        })

        // Send confirmation email to the user
        await resend.emails.send({
            from: `Black Health Intelligence <${OFFICE_EMAIL}>`,
            to: [email],
            subject: `Thank you for contacting Black Health Intelligence`,
            html: `
                <p>Hi ${name},</p>
                <p>Thank you for reaching out to Black Health Intelligence. We have received your message and will get back to you shortly.</p>
                <p><strong>Your message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <p>Kind regards,</p>
                <p>The Black Health Intelligence Team</p>
            `,
        })

        return NextResponse.json({ message: 'Message sent successfully' }, { status: 200 })
    } catch (error: any) {
        console.error('Failed to send contact message:', error)
        return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 })
    }
}

