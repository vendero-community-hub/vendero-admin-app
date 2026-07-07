'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useActionModal } from '@/components/ui/action-modal'

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
  const actionModal = useActionModal()

  async function submitReview() {
    const token = getAdminToken()
    const result = await actionModal.form({
      title: decision === 'approve' ? 'Approve KYC document?' : 'Reject KYC document?',
      description:
        decision === 'approve'
          ? 'Add optional notes and profile updates before approving this document.'
          : 'Provide a rejection reason before marking this document rejected.',
      confirmLabel: decision === 'approve' ? 'Approve document' : 'Reject document',
      variant: decision === 'reject' ? 'danger' : 'default',
      fields:
        decision === 'approve'
          ? [
              { name: 'reviewNotes', label: 'Review notes (optional)', type: 'textarea' },
              { name: 'fullName', label: 'Name as per document (optional)' },
              { name: 'businessName', label: 'Business name update (optional)' },
              { name: 'contactName', label: 'Contact name update (optional)' },
              { name: 'contactEmail', label: 'Email update (optional)' },
              { name: 'city', label: 'City update (optional)' },
              { name: 'state', label: 'State update (optional)' },
            ]
          : [
              { name: 'reviewNotes', label: 'Internal review notes (optional)', type: 'textarea' },
              {
                name: 'rejectionReason',
                label: 'Rejection reason',
                defaultValue: 'Document details do not match',
                required: true,
                type: 'textarea',
              },
            ],
    })
    if (!result.confirmed) return

    const reviewNotes = result.values.reviewNotes ?? ''
    const rejectionReason = decision === 'reject' ? result.values.rejectionReason ?? '' : ''
    const profileUpdates =
      decision === 'approve'
        ? {
            fullName: result.values.fullName || undefined,
            businessName: result.values.businessName || undefined,
            contactName: result.values.contactName || undefined,
            contactEmail: result.values.contactEmail || undefined,
            city: result.values.city || undefined,
            state: result.values.state || undefined,
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
    <>
      <Button
        onClick={submitReview}
        size="sm"
        variant={decision === 'approve' ? 'default' : 'outline'}
        disabled={working}
      >
        {working ? 'Saving...' : decision === 'approve' ? 'Approve' : 'Reject'}
      </Button>
      {actionModal.modal}
    </>
  )
}
