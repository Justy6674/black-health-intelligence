'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect: Bulk Void -> Invoice Cleanup (CSV mode)
 * Keeps old URLs working.
 */
export default function BulkVoidRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/xero/invoice-cleanup?mode=csv')
  }, [router])
  return (
    <div className="p-8 text-silver-400 text-sm">
      Redirecting to Invoice Cleanup…
    </div>
  )
}
