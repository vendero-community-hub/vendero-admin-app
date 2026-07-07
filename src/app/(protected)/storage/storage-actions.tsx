'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteStorageFileForm({
  fileKey,
  force,
  usageCount,
  action,
}: {
  fileKey: string
  force: boolean
  usageCount: number
  action: (formData: FormData) => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const message = force
          ? `This file is still linked in ${usageCount} place(s). Delete from Cloudflare storage anyway? Database links will remain.`
          : 'Delete this unused file from Cloudflare storage?'
        if (!window.confirm(message)) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="key" value={fileKey} />
      <input type="hidden" name="force" value={force ? 'true' : 'false'} />
      <Button
        type="submit"
        size="sm"
        variant={force ? 'outline' : 'secondary'}
        className={force ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10' : ''}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {force ? 'Delete anyway' : 'Delete'}
      </Button>
    </form>
  )
}
