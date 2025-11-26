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

        // Different prompts based on field type - ALL USE AUSTRALIAN ENGLISH WITH HTML FORMATTING
        const baseInstruction = `CRITICAL REQUIREMENTS:
1. AUSTRALIAN ENGLISH ONLY - Convert ALL American spellings to Australian:
   - color → colour, organization → organisation, center → centre
   - behavior → behaviour, realize → realise, program → programme (except computer programs)
   - personalized → personalised, specialized → specialised, optimize → optimise
   - defense → defence, license → licence (noun), practice → practise (verb)
2. Use simple HTML for formatting where appropriate:
   - Use <strong> for emphasis (NOT asterisks)
   - Use <br><br> for paragraph breaks
   - Use <ul><li> for bullet lists when listing items
3. Do NOT use markdown (* or ** or # or -)
4. Do NOT wrap text in quotes`

        const prompts: Record<string, string> = {
            short_description: `You are a professional copywriter. 

CRITICAL: Use Australian English spelling (color → colour, organization → organisation, personalized → personalised, etc.)

Clean up and format this project description for a portfolio card. Make it compelling, professional, and concise (2-3 sentences max). Fix any grammar or spelling issues. Keep the core message but make it polished.

IMPORTANT: Return PLAIN TEXT ONLY - NO HTML tags, NO <strong>, NO <br>, NO formatting whatsoever. Just clean prose sentences.

"${text}"

Return ONLY the improved plain text with Australian spelling, nothing else.`,

            long_description: `You are a professional copywriter. ${baseInstruction}

Clean up and format this detailed project description. Make it professional, well-structured, and compelling. Fix grammar, improve clarity. Use HTML formatting:
- Use <strong> for key terms or headings within the text
- Use <br><br> between paragraphs
- Use <ul><li> for lists if there are multiple items to list
Keep all important details:

"${text}"

Return ONLY the improved HTML-formatted text with Australian spelling, nothing else.`,

            problem_solves: `You are a professional copywriter. ${baseInstruction}

Clean up and format this problem statement for a project. Make it clear, compelling, and professional. Use HTML formatting where it helps readability:
- Use <strong> for key problem areas
- Use <br><br> between paragraphs
- Use <ul><li> if listing multiple problems

"${text}"

Return ONLY the improved HTML-formatted text with Australian spelling, nothing else.`,

            target_audience: `You are a professional copywriter. ${baseInstruction}

Clean up and format this target audience description. Make it clear and specific. Use HTML formatting:
- Use <ul><li> to list different audience segments if there are multiple
- Use <strong> for key audience types

"${text}"

Return ONLY the improved HTML-formatted text with Australian spelling, nothing else.`,

            build_details: `You are a technical writer. ${baseInstruction}

Clean up and format this tech stack / build details description. Make it clear, organized, and professional. Use HTML formatting:
- Use <ul><li> to list technologies
- Group related technologies together
- Use <strong> for category headings like "Frontend:", "Backend:", etc.

"${text}"

Return ONLY the improved HTML-formatted text with Australian spelling, nothing else.`,

            default: `You are a professional copywriter. ${baseInstruction}

Clean up and format this text. Fix grammar, improve clarity, and make it professional. Use appropriate HTML formatting (<strong>, <br>, <ul><li>) where it improves readability:

"${text}"

Return ONLY the improved HTML-formatted text with Australian spelling, nothing else.`
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

