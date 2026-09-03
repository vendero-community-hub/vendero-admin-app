'use client'

import * as React from 'react'
import { Film, Trash2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadAdminMedia } from '@/lib/trusted-media'

type BannerVideoFieldsProps = {
  currentObjectKey?: string | null
  currentVideoUrl?: string | null
}

const maxBytes = 5 * 1024 * 1024
const allowedTypes = new Set(['video/mp4', 'video/quicktime'])

export function BannerVideoFields({
  currentObjectKey = null,
  currentVideoUrl = null,
}: BannerVideoFieldsProps) {
  const [asset, setAsset] = React.useState<{
    id: string | null
    objectKey: string
    url: string | null
  } | null>(
    currentObjectKey
      ? { id: null, objectKey: currentObjectKey, url: currentVideoUrl }
      : null
  )
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')

  const chooseVideo = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setError('')
    if (!file) return
    if (!allowedTypes.has(file.type)) {
      setAsset(null)
      setError('Choose an MP4 or MOV video.')
      return
    }
    if (file.size < 1 || file.size > maxBytes) {
      setAsset(null)
      setError('Banner video must be 5 MB or smaller.')
      return
    }

    setUploading(true)
    setAsset(null)
    try {
      const uploaded = await uploadAdminMedia(file, 'platform.banner-video')
      setAsset({ id: uploaded.id, objectKey: uploaded.objectKey, url: uploaded.url })
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Unable to upload the banner video.'
      )
    } finally {
      setUploading(false)
    }
  }, [])

  return (
    <div
      className="space-y-2 sm:col-span-2"
      onSubmitCapture={(event) => {
        if (uploading || (selectedFile && !asset)) {
          event.preventDefault()
          setError(uploading ? 'Wait for the video upload to finish.' : 'Choose a valid video again.')
        }
      }}
    >
      <input type="hidden" name="bannerVideoObjectKey" value={asset?.objectKey ?? ''} />
      <input type="hidden" name="bannerVideoAssetId" value={asset?.id ?? ''} />

      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Banner video
      </label>
      <label className="relative flex min-h-20 cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-background/35 px-4 py-3 hover:border-primary/60 hover:bg-primary/5">
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          onChange={chooseVideo}
        />
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <UploadCloud className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm">
            {selectedFile?.name ?? (asset ? 'Secure banner video selected' : 'Choose MP4 or MOV')}
          </strong>
          <span className="text-xs text-muted-foreground">Maximum 5 MB. The Worker verifies the real format.</span>
        </span>
      </label>

      {uploading ? <p className="text-xs text-primary">Uploading and checking video…</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {asset ? (
        <div className="flex items-center gap-3 rounded-md border border-border/70 bg-background/30 p-3">
          {asset.url ? (
            <video className="h-20 w-32 rounded bg-black object-contain" controls preload="metadata" src={asset.url} />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded bg-muted">
              <Film className="h-5 w-5" />
            </span>
          )}
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            Ready to use for the video action.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setAsset(null)
              setSelectedFile(null)
              setError('')
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Remove
          </Button>
        </div>
      ) : null}
    </div>
  )
}
