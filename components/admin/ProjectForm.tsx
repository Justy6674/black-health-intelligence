'use client'

import { Suspense } from 'react'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { ProjectCategory, ProjectStatus, ProjectSubcategory, MarketScope, DevelopmentPhase } from '@/lib/types'

// Define component props and inner form component separately to wrap in Suspense
interface ProjectFormProps {
    mode: 'create' | 'edit'
    initialData?: Partial<{
        id: string
        name: string
        category: ProjectCategory
        subcategory?: ProjectSubcategory
        short_description: string
        long_description?: string
        logo_url?: string
        website_url?: string
        status: ProjectStatus
        display_order: number
        featured: boolean
        problem_solves?: string
        target_audience?: string
        build_details?: string
        estimated_release?: string
        revenue_stream?: string
        market_scope?: MarketScope
        for_sale?: boolean
        sale_price?: number
        investment_opportunity?: boolean
        development_phase?: DevelopmentPhase
    }>
}

// AI Format Button Component
function AIFormatButton({ 
    field, 
    text, 
    onFormat 
}: { 
    field: string
    text: string
    onFormat: (formattedText: string) => void 
}) {
    const [loading, setLoading] = useState(false)

    const handleFormat = async () => {
        if (!text.trim()) return
        
        setLoading(true)
        try {
            const response = await fetch('/api/ai-format', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, field }),
            })
            
            if (!response.ok) {
                throw new Error('Failed to format')
            }
            
            const data = await response.json()
            if (data.formattedText) {
                onFormat(data.formattedText)
            }
        } catch (error) {
            console.error('AI format error:', error)
            alert('Failed to format text. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleFormat}
            disabled={loading || !text.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Clean up and format with AI"
        >
            {loading ? (
                <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Formatting...
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    AI Format
                </>
            )}
        </button>
    )
}

function ProjectFormContent({ mode, initialData }: ProjectFormProps) {
    const router = useRouter()
    // Initialize Supabase client directly in component
    const [supabase] = useState(() => {
        if (typeof window === 'undefined') return null
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    })

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        category: initialData?.category || 'health-saas' as ProjectCategory,
        subcategory: initialData?.subcategory || undefined,
        short_description: initialData?.short_description || '',
        long_description: initialData?.long_description || '',
        logo_url: initialData?.logo_url || '',
        website_url: initialData?.website_url || '',
        status: initialData?.status || 'development' as ProjectStatus,
        display_order: initialData?.display_order || 0,
        featured: initialData?.featured || false,
        problem_solves: initialData?.problem_solves || '',
        target_audience: initialData?.target_audience || '',
        build_details: initialData?.build_details || '',
        estimated_release: initialData?.estimated_release || '',
        revenue_stream: initialData?.revenue_stream || '',
        market_scope: initialData?.market_scope || undefined,
        for_sale: initialData?.for_sale || false,
        sale_price: initialData?.sale_price || '',
        investment_opportunity: initialData?.investment_opportunity || false,
        development_phase: initialData?.development_phase || undefined,
    })

    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string>(initialData?.logo_url || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (file) {
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp']
        },
        maxFiles: 1,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!supabase) return

        setError('')
        setLoading(true)

        try {
            let logoUrl = formData.logo_url

            // Upload logo if a new file was selected
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('project-logos')
                    .upload(filePath, logoFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('project-logos')
                    .getPublicUrl(filePath)

                logoUrl = publicUrl
            }

            // Generate slug from name
            const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

            const projectData: any = {
                ...formData,
                slug,
                logo_url: logoUrl,
                sale_price: formData.sale_price ? parseFloat(formData.sale_price.toString()) : null,
                estimated_release: formData.estimated_release || null,
                subcategory: formData.category === 'health-saas' ? formData.subcategory : null,
            }

            // Remove empty strings and convert to null
            Object.keys(projectData).forEach(key => {
                if (projectData[key] === '' || projectData[key] === undefined) {
                    projectData[key] = null
                }
            })

            if (mode === 'create') {
                const { error: insertError } = await supabase
                    .from('projects')
                    .insert([projectData])

                if (insertError) throw insertError
            } else {
                const { error: updateError } = await supabase
                    .from('projects')
                    .update(projectData)
                    .eq('id', initialData?.id)

                if (updateError) throw updateError
            }

            router.push('/admin/projects')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Failed to save project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Basic Information Section */}
            <div className="border-b border-white/10 pb-6">
                <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
                
                {/* Logo upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-silver-300 mb-2">
                        Project Logo
                    </label>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                            ? 'border-slate-blue bg-slate-blue/10'
                            : 'border-silver-700/30 hover:border-silver-600'
                            }`}
                    >
                        <input {...getInputProps()} />
                        {logoPreview ? (
                            <div className="space-y-4">
                                <div className="relative w-32 h-32 mx-auto">
                                    <Image
                                        src={logoPreview}
                                        alt="Logo preview"
                                        width={128}
                                        height={128}
                                        className="object-contain"
                                    />
                                </div>
                                <p className="text-sm text-silver-400">Click or drag to replace</p>
                            </div>
                        ) : (
                            <div>
                                <svg
                                    className="w-12 h-12 mx-auto mb-4 text-silver-600"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-silver-400">Drag & drop logo here, or click to select</p>
                                <p className="text-sm text-silver-600 mt-2">PNG, JPG, SVG up to 10MB</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Project name */}
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-silver-300 mb-2">
                        Project Name *
                    </label>
                    <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                        placeholder="e.g., Downscale Weight Loss Clinic"
                    />
                </div>

                {/* Category */}
                <div className="mb-4">
                    <label htmlFor="category" className="block text-sm font-medium text-silver-300 mb-2">
                        Category *
                    </label>
                    <select
                        id="category"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectCategory, subcategory: undefined })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                    >
                        <option value="clinical">Clinical Practice</option>
                        <option value="health-saas">Health SaaS</option>
                        <option value="other">Other Ventures</option>
                    </select>
                </div>

                {/* Subcategory (only for health-saas) */}
                {formData.category === 'health-saas' && (
                    <div className="mb-4">
                        <label htmlFor="subcategory" className="block text-sm font-medium text-silver-300 mb-2">
                            Subcategory *
                        </label>
                        <select
                            id="subcategory"
                            required
                            value={formData.subcategory || ''}
                            onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as ProjectSubcategory })}
                            className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                        >
                            <option value="">Select subcategory</option>
                            <option value="health-saas">Health-Related SaaS</option>
                            <option value="non-health-saas">Non-Health-Related SaaS</option>
                        </select>
                    </div>
                )}

                {/* Short description */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="short_description" className="block text-sm font-medium text-silver-300">
                            Short Description * (for card preview)
                        </label>
                        <AIFormatButton 
                            field="short_description" 
                            text={formData.short_description}
                            onFormat={(text) => setFormData({ ...formData, short_description: text })}
                        />
                    </div>
                    <textarea
                        id="short_description"
                        required
                        rows={3}
                        value={formData.short_description}
                        onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none"
                        placeholder="Brief description of what this project does..."
                    />
                </div>

                {/* Long description */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="long_description" className="block text-sm font-medium text-silver-300">
                            Long Description (optional)
                        </label>
                        <AIFormatButton 
                            field="long_description" 
                            text={formData.long_description}
                            onFormat={(text) => setFormData({ ...formData, long_description: text })}
                        />
                    </div>
                    <textarea
                        id="long_description"
                        rows={6}
                        value={formData.long_description}
                        onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none"
                        placeholder="Detailed description for future use..."
                    />
                </div>

                {/* Website URL */}
                <div className="mb-4">
                    <label htmlFor="website_url" className="block text-sm font-medium text-silver-300 mb-2">
                        Website URL
                    </label>
                    <input
                        id="website_url"
                        type="url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                        placeholder="https://example.com"
                    />
                </div>

                {/* Status */}
                <div className="mb-4">
                    <label htmlFor="status" className="block text-sm font-medium text-silver-300 mb-2">
                        Status *
                    </label>
                    <select
                        id="status"
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                    >
                        <option value="active">Active</option>
                        <option value="development">In Development</option>
                        <option value="coming-soon">Coming Soon</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {/* Development Phase */}
                <div className="mb-4">
                    <label htmlFor="development_phase" className="block text-sm font-medium text-silver-300 mb-2">
                        Development Phase
                    </label>
                    <select
                        id="development_phase"
                        value={formData.development_phase || ''}
                        onChange={(e) => setFormData({ ...formData, development_phase: e.target.value as DevelopmentPhase || undefined })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                    >
                        <option value="">Select phase</option>
                        <option value="concept">Concept</option>
                        <option value="mvp">MVP</option>
                        <option value="beta">Beta</option>
                        <option value="production">Production</option>
                    </select>
                </div>

                {/* Display order */}
                <div className="mb-4">
                    <label htmlFor="display_order" className="block text-sm font-medium text-silver-300 mb-2">
                        Display Order (lower numbers appear first)
                    </label>
                    <input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                        placeholder="0"
                    />
                </div>

                {/* Featured toggle */}
                <div className="flex items-center gap-3">
                    <input
                        id="featured"
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="w-5 h-5 rounded bg-charcoal border-silver-700/30 text-slate-blue focus:ring-2 focus:ring-slate-blue"
                    />
                    <label htmlFor="featured" className="text-sm font-medium text-silver-300">
                        Featured project
                    </label>
                </div>
            </div>

            {/* Business Details Section */}
            <div className="border-b border-white/10 pb-6">
                <h2 className="text-xl font-bold text-white mb-4">Business Details</h2>

                {/* Problem it solves */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="problem_solves" className="block text-sm font-medium text-silver-300">
                            Problem It Solves
                        </label>
                        <AIFormatButton 
                            field="problem_solves" 
                            text={formData.problem_solves}
                            onFormat={(text) => setFormData({ ...formData, problem_solves: text })}
                        />
                    </div>
                    <textarea
                        id="problem_solves"
                        rows={4}
                        value={formData.problem_solves}
                        onChange={(e) => setFormData({ ...formData, problem_solves: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none"
                        placeholder="Describe the problem this project solves..."
                    />
                </div>

                {/* Target audience */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="target_audience" className="block text-sm font-medium text-silver-300">
                            Target Audience
                        </label>
                        <AIFormatButton 
                            field="target_audience" 
                            text={formData.target_audience}
                            onFormat={(text) => setFormData({ ...formData, target_audience: text })}
                        />
                    </div>
                    <textarea
                        id="target_audience"
                        rows={3}
                        value={formData.target_audience}
                        onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none"
                        placeholder="Who is this product for?"
                    />
                </div>

                {/* Build details */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label htmlFor="build_details" className="block text-sm font-medium text-silver-300">
                            Build Details / Tech Stack
                        </label>
                        <AIFormatButton 
                            field="build_details" 
                            text={formData.build_details}
                            onFormat={(text) => setFormData({ ...formData, build_details: text })}
                        />
                    </div>
                    <textarea
                        id="build_details"
                        rows={3}
                        value={formData.build_details}
                        onChange={(e) => setFormData({ ...formData, build_details: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent resize-none font-mono text-sm"
                        placeholder="e.g., Next.js, React, TypeScript, Supabase..."
                    />
                </div>

                {/* Estimated release */}
                <div className="mb-4">
                    <label htmlFor="estimated_release" className="block text-sm font-medium text-silver-300 mb-2">
                        Estimated Release Date
                    </label>
                    <input
                        id="estimated_release"
                        type="date"
                        value={formData.estimated_release}
                        onChange={(e) => setFormData({ ...formData, estimated_release: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                    />
                </div>

                {/* Revenue stream */}
                <div className="mb-4">
                    <label htmlFor="revenue_stream" className="block text-sm font-medium text-silver-300 mb-2">
                        Revenue Stream
                    </label>
                    <input
                        id="revenue_stream"
                        type="text"
                        value={formData.revenue_stream}
                        onChange={(e) => setFormData({ ...formData, revenue_stream: e.target.value })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                        placeholder="e.g., Subscription-based, One-time purchase, Freemium..."
                    />
                </div>

                {/* Market scope */}
                <div className="mb-4">
                    <label htmlFor="market_scope" className="block text-sm font-medium text-silver-300 mb-2">
                        Market Scope
                    </label>
                    <select
                        id="market_scope"
                        value={formData.market_scope || ''}
                        onChange={(e) => setFormData({ ...formData, market_scope: e.target.value as MarketScope || undefined })}
                        className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                    >
                        <option value="">Select market scope</option>
                        <option value="Local Australian">Local Australian</option>
                        <option value="International">International</option>
                        <option value="Both">Both</option>
                    </select>
                </div>
            </div>

            {/* Investment & Sale Section */}
            <div className="pb-6">
                <h2 className="text-xl font-bold text-white mb-4">Investment & Sale</h2>

                {/* For sale */}
                <div className="mb-4 flex items-center gap-3">
                    <input
                        id="for_sale"
                        type="checkbox"
                        checked={formData.for_sale}
                        onChange={(e) => setFormData({ ...formData, for_sale: e.target.checked })}
                        className="w-5 h-5 rounded bg-charcoal border-silver-700/30 text-slate-blue focus:ring-2 focus:ring-slate-blue"
                    />
                    <label htmlFor="for_sale" className="text-sm font-medium text-silver-300">
                        Available for Sale
                    </label>
                </div>

                {/* Sale price */}
                {formData.for_sale && (
                    <div className="mb-4">
                        <label htmlFor="sale_price" className="block text-sm font-medium text-silver-300 mb-2">
                            Sale Price (AUD)
                        </label>
                        <input
                            id="sale_price"
                            type="number"
                            step="0.01"
                            value={formData.sale_price}
                            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value ? parseFloat(e.target.value) : '' })}
                            className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                            placeholder="0.00"
                        />
                    </div>
                )}

                {/* Investment opportunity */}
                <div className="mb-4 flex items-center gap-3">
                    <input
                        id="investment_opportunity"
                        type="checkbox"
                        checked={formData.investment_opportunity}
                        onChange={(e) => setFormData({ ...formData, investment_opportunity: e.target.checked })}
                        className="w-5 h-5 rounded bg-charcoal border-silver-700/30 text-slate-blue focus:ring-2 focus:ring-slate-blue"
                    />
                    <label htmlFor="investment_opportunity" className="text-sm font-medium text-silver-300">
                        Seeking Investment / Partners
                    </label>
                </div>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center gap-4 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Update Project'}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary"
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}

export default function ProjectForm({ mode, initialData }: ProjectFormProps) {
    return (
        <Suspense fallback={<div className="text-white">Loading form...</div>}>
            <ProjectFormContent mode={mode} initialData={initialData} />
        </Suspense>
    )
}
