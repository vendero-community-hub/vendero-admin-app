'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ENV_HEADERS } from '@/lib/environment'
import { cn } from '@/lib/utils'

const ADMIN_COOKIE_NAMES = [
  'vendero_admin_access_token',
  'vendero_admin_refresh_token',
  'vendero_admin_session_id',
]

function getCookieValue(name: string) {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

function clearAdminCookies() {
  for (const name of ADMIN_COOKIE_NAMES) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
  }
}

export function AdminLogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function logout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    const token = getCookieValue('vendero_admin_access_token')
    const sessionId = getCookieValue('vendero_admin_session_id')

    try {
      if (token) {
        await fetch('/api/v1/account/logout', {
          method: 'POST',
          headers: {
            ...ENV_HEADERS,
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ sessionId: sessionId ?? null }),
        })
      }
    } catch {
      // Local logout should still complete if the API session is already expired.
    } finally {
      clearAdminCookies()
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('rounded-full px-3 text-muted-foreground', className)}
      disabled={isLoggingOut}
      onClick={logout}
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? 'Logging out' : 'Logout'}
    </Button>
  )
}
