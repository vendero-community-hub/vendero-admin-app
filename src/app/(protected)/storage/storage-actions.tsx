'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteStorageFileForm({
  fileKey,
  usageCount,
  action,
}: {
  fileKey: string
  usageCount: number
  action: (formData: FormData) => Promise<void>
}) {
  const linked = usageCount > 0

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (linked) {
          event.preventDefault()
          return
        }
        if (!window.confirm('Schedule this unlinked file for deletion after the seven-day grace period?')) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="key" value={fileKey} />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={linked}
        title={linked ? 'Replace or unlink this asset before deleting it.' : undefined}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {linked ? 'Linked' : 'Schedule deletion'}
      </Button>
    </form>
  )
}
