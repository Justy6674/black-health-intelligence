import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { text, field } = await request.json()

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
        }

        // Different prompts based on field type
        const prompts: Record<string, string> = {
            short_description: `You are a professional copywriter. Clean up and format this project description for a portfolio card. Make it compelling, professional, and concise (2-3 sentences max). Fix any grammar or spelling issues. Keep the core message but make it polished:

"${text}"

Return ONLY the improved text, nothing else.`,

            long_description: `You are a professional copywriter. Clean up and format this detailed project description. Make it professional, well-structured, and compelling. Fix grammar, improve clarity, and organize into clear paragraphs if needed. Keep all important details:

"${text}"

Return ONLY the improved text, nothing else.`,

            problem_solves: `You are a professional copywriter. Clean up and format this problem statement for a project. Make it clear, compelling, and professional. Explain the problem in a way that resonates with the target audience:

"${text}"

Return ONLY the improved text, nothing else.`,

            target_audience: `You are a professional copywriter. Clean up and format this target audience description. Make it clear and specific. Use professional language:

"${text}"

Return ONLY the improved text, nothing else.`,

            build_details: `You are a technical writer. Clean up and format this tech stack / build details description. Make it clear, organized, and professional. List technologies clearly:

"${text}"

Return ONLY the improved text, nothing else.`,

            default: `You are a professional copywriter. Clean up and format this text. Fix grammar, improve clarity, and make it professional:

"${text}"

Return ONLY the improved text, nothing else.`
        }

        const prompt = prompts[field] || prompts.default

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('OpenAI API error:', error)
            return NextResponse.json({ error: 'Failed to format text' }, { status: 500 })
        }

        const data = await response.json()
        const formattedText = data.choices?.[0]?.message?.content?.trim()

        if (!formattedText) {
            return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
        }

        return NextResponse.json({ formattedText })

    } catch (error) {
        console.error('AI format error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

