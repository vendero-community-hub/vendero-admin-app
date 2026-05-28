'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))

  return tokenEntry?.split('=')[1] ?? null
}

export function ReviewKycButton({
  documentId,
  decision,
}: {
  documentId: number
  decision: 'approve' | 'reject'
}) {
  const [working, setWorking] = useState(false)

  async function submitReview() {
    const token = getAdminToken()
    const reviewNotes =
      window.prompt(
        decision === 'approve'
          ? 'Optional review notes'
          : 'Optional internal review notes',
        ''
      ) ?? ''
    const rejectionReason =
      decision === 'reject'
        ? window.prompt('Rejection reason for this document', 'Document details do not match')
        : ''
    const profileUpdates =
      decision === 'approve'
        ? {
            fullName: window.prompt('Name as per document (optional)', '') || undefined,
            businessName: window.prompt('Business name update (optional)', '') || undefined,
            contactName: window.prompt('Contact name update (optional)', '') || undefined,
            contactEmail: window.prompt('Email update (optional)', '') || undefined,
            city: window.prompt('City update (optional)', '') || undefined,
            state: window.prompt('State update (optional)', '') || undefined,
          }
        : undefined

    if (decision === 'reject' && !rejectionReason) {
      return
    }

    setWorking(true)
    try {
      await fetch(`/api/v1/admin/kyc/documents/${documentId}/review`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          decision,
          reviewNotes: reviewNotes || null,
          rejectionReason: rejectionReason || null,
          profileUpdates,
        }),
      })

      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button
      onClick={submitReview}
      size="sm"
      variant={decision === 'approve' ? 'default' : 'outline'}
      disabled={working}
    >
      {working ? 'Saving...' : decision === 'approve' ? 'Approve' : 'Reject'}
    </Button>
  )
}
