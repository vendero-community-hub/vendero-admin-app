'use client'

import * as React from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BannerEditModalProps = {
  title: string
  triggerLabel?: string
  children: React.ReactNode
}

export function BannerEditModal({ title, triggerLabel = 'Edit banner', children }: BannerEditModalProps) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        {triggerLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4">
          <button
            aria-label="Close edit banner modal"
            className="absolute inset-0 cursor-default"
            type="button"
            onClick={() => setOpen(false)}
          />
          <div
            aria-modal="true"
            role="dialog"
            className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{title}</p>
              </div>
              <Button
                aria-label="Close"
                title="Close"
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto p-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}
