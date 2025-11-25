'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SolutionsContent } from '@/lib/types'

interface SolutionsContentEditorProps {
    initialSections: Array<Partial<SolutionsContent> & { section: SolutionsContent['section'] }>
}

const sectionLabels: Record<SolutionsContent['section'], string> = {
    company_mission: 'Company Mission',
    founder_bio: 'Founder Bio',
    career_history: 'Career History',
    downscale_history: 'Downscale Business',
    clinical_governance: 'Clinical Governance',
    software_journey: 'Software Development Journey',
    bec_story: 'Bec&apos;s Story',
    vision: 'Vision'
}

export default function SolutionsContentEditor({ initialSections }: SolutionsContentEditorProps) {
    const router = useRouter()
    const supabase = createClient()

    const [sections, setSections] = useState(initialSections)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleContentChange = (section: SolutionsContent['section'], content: string) => {
        setSections(prev => prev.map(s => 
            s.section === section ? { ...s, content } : s
        ))
    }

    const handleOrderChange = (section: SolutionsContent['section'], newOrder: number) => {
        setSections(prev => prev.map(s => 
            s.section === section ? { ...s, display_order: newOrder } : s
        ))
    }

    const handleSave = async () => {
        setError('')
        setSuccess(false)
        setLoading(true)

        try {
            for (const section of sections) {
                if (section.id) {
                    // Update existing
                    const { error: updateError } = await supabase
                        .from('solutions_content')
                        .update({
                            content: section.content || '',
                            display_order: section.display_order || 0
                        })
                        .eq('id', section.id)

                    if (updateError) throw updateError
                } else {
                    // Create new
                    const { error: insertError } = await supabase
                        .from('solutions_content')
                        .insert({
                            section: section.section,
                            content: section.content || '',
                            display_order: section.display_order || 0
                        })

                    if (insertError) throw insertError
                }
            }

            setSuccess(true)
            setTimeout(() => {
                router.refresh()
            }, 1000)
        } catch (err: any) {
            setError(err.message || 'Failed to save content')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">Content saved successfully!</p>
                </div>
            )}

            {sections.map((section) => (
                <div key={section.section} className="card">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">
                                {sectionLabels[section.section]}
                            </h3>
                            <p className="text-sm text-silver-400">Section: {section.section}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="text-sm text-silver-300">
                                Order:
                                <input
                                    type="number"
                                    value={section.display_order || 0}
                                    onChange={(e) => handleOrderChange(section.section, parseInt(e.target.value) || 0)}
                                    className="ml-2 w-20 px-2 py-1 bg-charcoal border border-silver-700/30 rounded text-white"
                                />
                            </label>
                        </div>
                    </div>

                    <textarea
                        value={section.content || ''}
                        onChange={(e) => handleContentChange(section.section, e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none"
                        placeholder={`Enter content for ${sectionLabels[section.section]}...`}
                    />
                    <p className="text-xs text-silver-500 mt-2">
                        You can use HTML for formatting. For line breaks, use &lt;br&gt; or wrap paragraphs in &lt;p&gt; tags.
                    </p>
                </div>
            ))}

            <div className="flex items-center gap-4 pt-4">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : 'Save All Content'}
                </button>
                <a
                    href="/solutions"
                    target="_blank"
                    className="btn-secondary"
                >
                    Preview Page
                </a>
            </div>
        </div>
    )
}

