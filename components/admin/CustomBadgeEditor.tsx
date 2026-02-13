'use client'

import { useState } from 'react'
import { CustomBadge, BadgeColor, HighlightEffect } from '@/lib/types'
import { X, Plus, Sparkles } from 'lucide-react'

interface CustomBadgeEditorProps {
    badges: CustomBadge[]
    onChange: (badges: CustomBadge[]) => void
}

const BADGE_COLORS: { value: BadgeColor; label: string; preview: string }[] = [
    { value: 'yellow', label: 'Yellow/Gold', preview: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50' },
    { value: 'gold', label: 'Gold Premium', preview: 'bg-amber-500/30 text-amber-200 border-amber-400/50' },
    { value: 'green', label: 'Green', preview: 'bg-green-500/30 text-green-300 border-green-500/50' },
    { value: 'blue', label: 'Blue', preview: 'bg-blue-500/30 text-blue-300 border-blue-500/50' },
    { value: 'purple', label: 'Purple', preview: 'bg-purple-500/30 text-purple-300 border-purple-500/50' },
    { value: 'pink', label: 'Pink', preview: 'bg-pink-500/30 text-pink-300 border-pink-500/50' },
    { value: 'orange', label: 'Orange', preview: 'bg-orange-500/30 text-orange-300 border-orange-500/50' },
    { value: 'cyan', label: 'Cyan', preview: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50' },
    { value: 'red', label: 'Red', preview: 'bg-red-500/30 text-red-300 border-red-500/50' },
    { value: 'white', label: 'White/Silver', preview: 'bg-white/20 text-white border-white/50' },
]

const BADGE_EFFECTS: { value: HighlightEffect; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'glow', label: 'Glow' },
    { value: 'pulse', label: 'Pulse' },
]

// Get Tailwind classes for a badge color
export const getBadgeColorClasses = (color: BadgeColor): string => {
    const colorMap: Record<BadgeColor, string> = {
        yellow: 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50',
        gold: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
        green: 'bg-green-500/30 text-green-300 border-green-500/50',
        blue: 'bg-blue-500/30 text-blue-300 border-blue-500/50',
        purple: 'bg-purple-500/30 text-purple-300 border-purple-500/50',
        pink: 'bg-pink-500/30 text-pink-300 border-pink-500/50',
        orange: 'bg-orange-500/30 text-orange-300 border-orange-500/50',
        cyan: 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50',
        red: 'bg-red-500/30 text-red-300 border-red-500/50',
        white: 'bg-white/20 text-white border-white/50',
    }
    return colorMap[color] || colorMap.white
}

// Get effect classes
export const getBadgeEffectClasses = (effect: HighlightEffect): string => {
    switch (effect) {
        case 'glow': return 'shadow-[0_0_15px_currentColor]'
        case 'pulse': return 'animate-pulse'
        default: return ''
    }
}

export default function CustomBadgeEditor({ badges, onChange }: CustomBadgeEditorProps) {
    const [newBadgeText, setNewBadgeText] = useState('')
    const [newBadgeColor, setNewBadgeColor] = useState<BadgeColor>('yellow')
    const [newBadgeEffect, setNewBadgeEffect] = useState<HighlightEffect>('none')

    const addBadge = () => {
        if (!newBadgeText.trim()) return

        const newBadge: CustomBadge = {
            id: `badge-${Date.now()}`,
            text: newBadgeText.trim(),
            color: newBadgeColor,
            effect: newBadgeEffect,
        }

        onChange([...badges, newBadge])
        setNewBadgeText('')
        setNewBadgeColor('yellow')
        setNewBadgeEffect('none')
    }

    const removeBadge = (id: string) => {
        onChange(badges.filter(b => b.id !== id))
    }

    const updateBadge = (id: string, updates: Partial<CustomBadge>) => {
        onChange(badges.map(b => b.id === id ? { ...b, ...updates } : b))
    }

    return (
        <div className="space-y-6">
            {/* Existing Badges */}
            {badges.length > 0 && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-silver-300">
                        Current Badges ({badges.length})
                    </label>
                    <div className="space-y-3">
                        {badges.map((badge) => (
                            <div 
                                key={badge.id} 
                                className="flex flex-wrap items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg"
                            >
                                {/* Badge Preview */}
                                <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getBadgeColorClasses(badge.color)} ${getBadgeEffectClasses(badge.effect)}`}>
                                    {badge.text}
                                </div>

                                {/* Color Selector */}
                                <select
                                    value={badge.color}
                                    onChange={(e) => updateBadge(badge.id, { color: e.target.value as BadgeColor })}
                                    className="px-2 py-1 text-xs bg-charcoal border border-white/20 rounded text-white"
                                >
                                    {BADGE_COLORS.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>

                                {/* Effect Selector */}
                                <select
                                    value={badge.effect}
                                    onChange={(e) => updateBadge(badge.id, { effect: e.target.value as HighlightEffect })}
                                    className="px-2 py-1 text-xs bg-charcoal border border-white/20 rounded text-white"
                                >
                                    {BADGE_EFFECTS.map(e => (
                                        <option key={e.value} value={e.value}>{e.label}</option>
                                    ))}
                                </select>

                                {/* Remove Button */}
                                <button
                                    type="button"
                                    onClick={() => removeBadge(badge.id)}
                                    className="ml-auto p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add New Badge */}
            <div className="p-4 bg-white/5 border border-dashed border-white/20 rounded-lg">
                <label className="block text-sm font-medium text-silver-300 mb-3">
                    <Plus className="w-4 h-4 inline mr-1" />
                    Add Custom Badge
                </label>
                
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Badge Text */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-silver-500 mb-1">Badge Text</label>
                        <input
                            type="text"
                            value={newBadgeText}
                            onChange={(e) => setNewBadgeText(e.target.value)}
                            placeholder="e.g., For Sale, Hiring, Hot Deal..."
                            className="w-full px-3 py-2 bg-charcoal border border-white/20 rounded text-white text-sm placeholder-silver-600"
                        />
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-xs text-silver-500 mb-1">Colour</label>
                        <select
                            value={newBadgeColor}
                            onChange={(e) => setNewBadgeColor(e.target.value as BadgeColor)}
                            className="px-3 py-2 bg-charcoal border border-white/20 rounded text-white text-sm"
                        >
                            {BADGE_COLORS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Effect */}
                    <div>
                        <label className="block text-xs text-silver-500 mb-1">Effect</label>
                        <select
                            value={newBadgeEffect}
                            onChange={(e) => setNewBadgeEffect(e.target.value as HighlightEffect)}
                            className="px-3 py-2 bg-charcoal border border-white/20 rounded text-white text-sm"
                        >
                            {BADGE_EFFECTS.map(e => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Add Button */}
                    <button
                        type="button"
                        onClick={addBadge}
                        disabled={!newBadgeText.trim()}
                        className="px-4 py-2 bg-[var(--electric-blue)] text-white text-sm font-medium rounded hover:bg-[var(--electric-blue)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Add
                    </button>
                </div>

                {/* Preview */}
                {newBadgeText.trim() && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <label className="block text-xs text-silver-500 mb-2">Preview:</label>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getBadgeColorClasses(newBadgeColor)} ${getBadgeEffectClasses(newBadgeEffect)}`}>
                            <Sparkles className="w-3 h-3" />
                            {newBadgeText}
                        </span>
                    </div>
                )}
            </div>

            {/* Quick Add Presets */}
            <div>
                <label className="block text-xs text-silver-500 mb-2">Quick Add (click to add):</label>
                <div className="flex flex-wrap gap-2">
                    {['For Sale', 'Hiring', 'Seeking Partners', 'Revenue Raising', 'New', 'Featured', 'Hot Deal', 'Limited Time'].map(preset => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => {
                                const presetColors: Record<string, BadgeColor> = {
                                    'For Sale': 'gold',
                                    'Hiring': 'green',
                                    'Seeking Partners': 'purple',
                                    'Revenue Raising': 'blue',
                                    'New': 'pink',
                                    'Featured': 'orange',
                                    'Hot Deal': 'red',
                                    'Limited Time': 'cyan',
                                }
                                const newBadge: CustomBadge = {
                                    id: `badge-${Date.now()}`,
                                    text: preset,
                                    color: presetColors[preset] || 'yellow',
                                    effect: 'none',
                                }
                                onChange([...badges, newBadge])
                            }}
                            className="px-3 py-1 text-xs bg-white/5 text-silver-400 border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                        >
                            + {preset}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}


