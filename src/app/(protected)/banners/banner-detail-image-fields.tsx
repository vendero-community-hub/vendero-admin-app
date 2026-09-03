'use client'

import { useState } from 'react'
import { Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { uploadAdminMedia } from '@/lib/trusted-media'

type DetailImage = {
  objectKey: string
  url: string
}

export function BannerDetailImageFields({
  objectKeys,
  urls,
}: {
  objectKeys: string[]
  urls: string[]
}) {
  const [images, setImages] = useState<DetailImage[]>(() =>
    objectKeys.map((objectKey, index) => ({ objectKey, url: urls[index] ?? '' }))
  )
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  async function upload(files: FileList | null) {
    if (!files?.length) return
    const selected = Array.from(files).slice(0, Math.max(0, 10 - images.length))
    if (!selected.length) {
      setMessage('Banner details support at most ten images.')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const uploaded: Awaited<ReturnType<typeof uploadAdminMedia>>[] = []
      for (const file of selected) {
        uploaded.push(await uploadAdminMedia(file, 'platform.banner-detail-image'))
      }
      setImages((current) => [
        ...current,
        ...uploaded.map((asset) => ({ objectKey: asset.objectKey, url: asset.url ?? '' })),
      ])
      setMessage(`${uploaded.length} detail image${uploaded.length === 1 ? '' : 's'} uploaded.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload detail images')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Detail images</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, or WebP; up to 10 MB each.</p>
        </div>
        <label className="cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm font-medium">
          {uploading ? 'Uploading...' : 'Choose images'}
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              void upload(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      {images.map((image, index) => (
        <div key={image.objectKey} className="flex items-center gap-2 rounded-md border border-border p-2">
          <input type="hidden" name="detailImageObjectKeys" value={image.objectKey} />
          {image.url ? (
            <img src={image.url} alt="Banner detail preview" className="h-14 w-20 rounded object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-xs" title={image.objectKey}>
            Detail image {index + 1}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Remove detail image ${index + 1}`}
            onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
