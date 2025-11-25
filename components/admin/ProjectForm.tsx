'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { ProjectCategory, ProjectStatus } from '@/lib/types'

interface ProjectFormProps {
    mode: 'create' | 'edit'
    initialData?: {
        id?: string
        name: string
        category: ProjectCategory
        short_description: string
        long_description?: string
        logo_url?: string
        website_url?: string
        status: ProjectStatus
        display_order: number
        featured: boolean
    }
}

export default function ProjectForm({ mode, initialData }: ProjectFormProps) {
    const router = useRouter()
    const supabase = createClient()

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        category: initialData?.category || 'health-saas' as ProjectCategory,
        short_description: initialData?.short_description || '',
        long_description: initialData?.long_description || '',
        logo_url: initialData?.logo_url || '',
        website_url: initialData?.website_url || '',
        status: initialData?.status || 'development' as ProjectStatus,
        display_order: initialData?.display_order || 0,
        featured: initialData?.featured || false,
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

            const projectData = {
                ...formData,
                slug,
                logo_url: logoUrl,
            }

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

            {/* Logo upload */}
            <div>
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
            <div>
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
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-silver-300 mb-2">
                    Category *
                </label>
                <select
                    id="category"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectCategory })}
                    className="w-full px-4 py-3 bg-charcoal border border-silver-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-slate-blue focus:border-transparent"
                >
                    <option value="clinical">Clinical Practice</option>
                    <option value="health-saas">Health SaaS</option>
                    <option value="other">Other Ventures</option>
                </select>
            </div>

            {/* Short description */}
            <div>
                <label htmlFor="short_description" className="block text-sm font-medium text-silver-300 mb-2">
                    Short Description * (for card preview)
                </label>
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
            <div>
                <label htmlFor="long_description" className="block text-sm font-medium text-silver-300 mb-2">
                    Long Description (optional)
                </label>
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
            <div>
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
            <div>
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

            {/* Display order */}
            <div>
                <label htmlFor="display_order" className="block text-sm font-medium text-silver-300 mb-2">
                    Display Order (lower numbers appear first)
                </label>
                <input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
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
