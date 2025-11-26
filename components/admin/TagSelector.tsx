'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Tag, TagCategory } from '@/lib/types'

interface TagSelectorProps {
    selectedTags: Tag[]
    onTagsChange: (tags: Tag[]) => void
}

const categoryLabels: Record<TagCategory, string> = {
    tech_stack: 'Tech Stack',
    build_phase: 'Build Phase',
    business_model: 'Business Model',
    project_type: 'Project Type',
}

const categoryColors: Record<TagCategory, string> = {
    tech_stack: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    build_phase: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    business_model: 'bg-green-500/20 text-green-400 border-green-500/30',
    project_type: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export default function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
    const [allTags, setAllTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [newTagInputs, setNewTagInputs] = useState<Record<TagCategory, string>>({
        tech_stack: '',
        build_phase: '',
        business_model: '',
        project_type: '',
    })
    const [addingTag, setAddingTag] = useState<TagCategory | null>(null)

    const [supabase] = useState(() => {
        if (typeof window === 'undefined') return null
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    })

    useEffect(() => {
        if (!supabase) return
        
        const fetchTags = async () => {
            const { data, error } = await supabase
                .from('tags')
                .select('*')
                .order('name')
            
            if (!error && data) {
                setAllTags(data)
            }
            setLoading(false)
        }
        
        fetchTags()
    }, [supabase])

    const toggleTag = (tag: Tag) => {
        const isSelected = selectedTags.some(t => t.id === tag.id)
        if (isSelected) {
            onTagsChange(selectedTags.filter(t => t.id !== tag.id))
        } else {
            onTagsChange([...selectedTags, tag])
        }
    }

    const addCustomTag = async (category: TagCategory) => {
        if (!supabase) return
        
        const name = newTagInputs[category].trim()
        if (!name) return

        setAddingTag(category)
        
        try {
            const { data, error } = await supabase
                .from('tags')
                .insert({ name, category })
                .select()
                .single()
            
            if (error) {
                if (error.code === '23505') {
                    // Tag already exists, find it
                    const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase() && t.category === category)
                    if (existing && !selectedTags.some(t => t.id === existing.id)) {
                        onTagsChange([...selectedTags, existing])
                    }
                } else {
                    console.error('Error adding tag:', error)
                }
            } else if (data) {
                setAllTags([...allTags, data])
                onTagsChange([...selectedTags, data])
            }
            
            setNewTagInputs({ ...newTagInputs, [category]: '' })
        } catch (err) {
            console.error('Error adding tag:', err)
        } finally {
            setAddingTag(null)
        }
    }

    const tagsByCategory = (category: TagCategory) => 
        allTags.filter(tag => tag.category === category)

    if (loading) {
        return <div className="text-silver-400 text-sm">Loading tags...</div>
    }

    const categories: TagCategory[] = ['project_type', 'build_phase', 'tech_stack', 'business_model']

    return (
        <div className="space-y-6">
            {categories.map(category => (
                <div key={category} className="border border-silver-700/30 rounded-lg p-4 bg-charcoal/30">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${categoryColors[category].split(' ')[0]}`} />
                        {categoryLabels[category]}
                    </h4>
                    
                    {/* Existing tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tagsByCategory(category).map(tag => {
                            const isSelected = selectedTags.some(t => t.id === tag.id)
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                                        isSelected 
                                            ? categoryColors[category] + ' ring-2 ring-white/20'
                                            : 'bg-white/5 text-silver-400 border-silver-700/30 hover:bg-white/10'
                                    }`}
                                >
                                    {isSelected && (
                                        <span className="mr-1">✓</span>
                                    )}
                                    {tag.name}
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Add custom tag */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTagInputs[category]}
                            onChange={(e) => setNewTagInputs({ ...newTagInputs, [category]: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addCustomTag(category)
                                }
                            }}
                            placeholder={`Add custom ${categoryLabels[category].toLowerCase()}...`}
                            className="flex-1 px-3 py-2 text-sm bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-1 focus:ring-slate-blue"
                        />
                        <button
                            type="button"
                            onClick={() => addCustomTag(category)}
                            disabled={!newTagInputs[category].trim() || addingTag === category}
                            className="px-3 py-2 text-sm font-medium bg-white/10 border border-silver-700/30 rounded-lg text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {addingTag === category ? '...' : '+'}
                        </button>
                    </div>
                </div>
            ))}

            {/* Selected tags summary */}
            {selectedTags.length > 0 && (
                <div className="pt-4 border-t border-silver-700/30">
                    <p className="text-xs text-silver-500 mb-2">Selected ({selectedTags.length}):</p>
                    <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tag => (
                            <span
                                key={tag.id}
                                className={`px-2 py-1 text-xs rounded-full border ${categoryColors[tag.category]}`}
                            >
                                {tag.name}
                                <button
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className="ml-1.5 hover:text-white"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

