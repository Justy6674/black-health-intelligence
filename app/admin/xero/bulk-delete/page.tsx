'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect: Bulk Delete -> Invoice Cleanup (fetch mode)
 * Keeps old URLs working.
 */
export default function BulkDeleteRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/xero/invoice-cleanup?mode=fetch')
  }, [router])
  return (
    <div className="p-8 text-silver-400 text-sm">
      Redirecting to Invoice Cleanup…
    </div>
  )
}
