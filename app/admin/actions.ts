'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProjectOrder(items: { id: string; display_order: number }[]) {
    const supabase = await createClient()

    for (const item of items) {
        const { error } = await supabase
            .from('projects')
            .update({ display_order: item.display_order })
            .eq('id', item.id)
        
        if (error) {
            console.error('Error updating project order:', error)
            throw new Error('Failed to update project order')
        }
    }

    revalidatePath('/')
    revalidatePath('/admin/projects')
}

