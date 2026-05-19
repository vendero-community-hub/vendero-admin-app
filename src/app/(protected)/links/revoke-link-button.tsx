'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))

  return tokenEntry?.split('=')[1] ?? null
}

export function RevokeLinkButton({ linkId }: { linkId: number }) {
  const [working, setWorking] = useState(false)

  async function revoke() {
    const token = getAdminToken()
    setWorking(true)
    try {
      await fetch(`/api/v1/admin/links/${linkId}/revoke`, {
        method: 'POST',
        headers: {
          authorization: token ? `Bearer ${token}` : '',
        },
      })
      window.location.reload()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button onClick={revoke} size="sm" variant="outline" disabled={working}>
      {working ? 'Revoking...' : 'Revoke'}
    </Button>
  )
}
