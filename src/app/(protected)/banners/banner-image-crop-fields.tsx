'use client'

import * as React from 'react'
import { CheckCircle2, Crop, Maximize2, Move, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BannerImageCropFieldsProps = {
  label?: string
  required?: boolean
  currentImageUrl?: string | null
  helperText?: string
  defaultMode?: string
  defaultCropPosition?: string
  defaultCropX?: string | number | null
  defaultCropY?: string | number | null
}

type ImageDetails = {
  width: number
  height: number
  ratioMatches: boolean
  exactSize: boolean
}

const requiredWidth = 1200
const requiredHeight = 500
const requiredAspectRatio = requiredWidth / requiredHeight
const aspectRatioTolerance = 0.01

const cropPositionDefaults: Record<string, { x: number; y: number }> = {
  northwest: { x: 0, y: 0 },
  north: { x: 50, y: 0 },
  northeast: { x: 100, y: 0 },
  west: { x: 0, y: 50 },
  centre: { x: 50, y: 50 },
  center: { x: 50, y: 50 },
  east: { x: 100, y: 50 },
  southwest: { x: 0, y: 100 },
  south: { x: 50, y: 100 },
  southeast: { x: 100, y: 100 },
  custom: { x: 50, y: 50 },
}

function clampPercent(value: unknown, fallback = 50) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(100, Math.max(0, number))
}

function initialCrop(defaultCropPosition?: string, defaultCropX?: string | number | null, defaultCropY?: string | number | null) {
  const fallback = cropPositionDefaults[String(defaultCropPosition ?? 'centre').toLowerCase()] ?? cropPositionDefaults.centre
  return {
    x: clampPercent(defaultCropX, fallback.x),
    y: clampPercent(defaultCropY, fallback.y),
  }
}

function getImageDetails(image: HTMLImageElement): ImageDetails {
  const width = image.naturalWidth
  const height = image.naturalHeight
  const ratioMatches = Math.abs(width / height - requiredAspectRatio) <= aspectRatioTolerance

  return {
    width,
    height,
    ratioMatches,
    exactSize: width === requiredWidth && height === requiredHeight,
  }
}

export function BannerImageCropFields({
  label = 'Upload banner',
  required = false,
  currentImageUrl,
  helperText,
  defaultMode = 'crop',
  defaultCropPosition = 'centre',
  defaultCropX,
  defaultCropY,
}: BannerImageCropFieldsProps) {
  const [mode, setMode] = React.useState(defaultMode === 'resize' ? 'resize' : 'crop')
  const [crop, setCrop] = React.useState(() => initialCrop(defaultCropPosition, defaultCropX, defaultCropY))
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState('')
  const [details, setDetails] = React.useState<ImageDetails | null>(null)
  const [cropModalOpen, setCropModalOpen] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const objectUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const updateCropFromPointer = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setCrop({
      x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
    })
  }, [])

  const handleFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    setDetails(null)
    setFileName(file?.name ?? '')
    setCropModalOpen(false)

    if (!file) {
      setPreviewUrl(null)
      return
    }

    const nextUrl = URL.createObjectURL(file)
    objectUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)

    const image = new Image()
    image.onload = () => {
      const nextDetails = getImageDetails(image)
      setDetails(nextDetails)
      setCrop({ x: 50, y: 50 })
      setMode(nextDetails.ratioMatches ? 'crop' : 'crop')
      if (!nextDetails.ratioMatches) setCropModalOpen(true)
    }
    image.src = nextUrl
  }, [])

  const roundedX = Math.round(crop.x)
  const roundedY = Math.round(crop.y)
  const needsAdjustment = Boolean(details && !details.ratioMatches)
  const previewObjectFit = mode === 'resize' ? 'fill' : 'cover'
  const previewMessage = details
    ? details.exactSize
      ? `Perfect size: ${requiredWidth} x ${requiredHeight} px.`
      : details.ratioMatches
        ? `Banner ratio is correct. It will resize cleanly from ${details.width} x ${details.height} px.`
        : `Needs adjustment: selected image is ${details.width} x ${details.height} px.`
    : currentImageUrl
      ? 'Current banner stays unchanged until you choose a new image.'
      : `Required banner frame: ${requiredWidth} x ${requiredHeight} px.`

  return (
    <div className="space-y-3 sm:col-span-2">
      <input type="hidden" name="bannerResizeMode" value={mode} />
      <input type="hidden" name="bannerCropPosition" value={needsAdjustment && mode === 'crop' ? 'custom' : 'centre'} />
      <input type="hidden" name="bannerCropX" value={String(roundedX)} />
      <input type="hidden" name="bannerCropY" value={String(roundedY)} />

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</label>
        <label className="relative block cursor-pointer rounded-lg border border-dashed border-border bg-background/35 p-5 transition hover:border-primary/60 hover:bg-primary/5">
          <input
            name="bannerFile"
            type="file"
            accept="image/*"
            required={required}
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {fileName || 'Choose banner image'}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                JPG, PNG, or WEBP. Required frame is {requiredWidth} x {requiredHeight} px.
              </span>
            </span>
            <span className="hidden rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground sm:inline-flex">
              Browse
            </span>
          </div>
        </label>
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
              {needsAdjustment ? (
                <Crop className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              <span className="truncate">{previewMessage}</span>
            </div>
            {needsAdjustment ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setCropModalOpen(true)}>
                <Crop className="h-4 w-4" />
                Adjust crop
              </Button>
            ) : null}
          </div>
          <div className="relative aspect-[12/5] bg-muted">
            <img
              src={previewUrl}
              alt=""
              draggable={false}
              className="h-full w-full select-none"
              style={{
                objectFit: previewObjectFit,
                objectPosition: `${roundedX}% ${roundedY}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {cropModalOpen && previewUrl ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <button
            type="button"
            aria-label="Close crop modal"
            className="absolute inset-0 cursor-default"
            onClick={() => setCropModalOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-lg font-semibold">Resize or crop banner</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Move the crop focus inside the {requiredWidth} x {requiredHeight} banner frame.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="shrink-0"
                onClick={() => setCropModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 overflow-auto p-5">
              <div className="flex rounded-md border border-border bg-background/70 p-1">
                <button
                  type="button"
                  className={`flex h-10 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium ${
                    mode === 'crop' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setMode('crop')}
                >
                  <Crop className="h-4 w-4" />
                  Crop
                </button>
                <button
                  type="button"
                  className={`flex h-10 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium ${
                    mode === 'resize' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setMode('resize')}
                >
                  <Maximize2 className="h-4 w-4" />
                  Resize
                </button>
              </div>

              <div
                className={`relative aspect-[12/5] overflow-hidden rounded-lg border border-border bg-muted ${
                  mode === 'crop' ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                onPointerDown={(event) => {
                  if (mode !== 'crop') return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDragging(true)
                  updateCropFromPointer(event)
                }}
                onPointerMove={(event) => {
                  if (!dragging || mode !== 'crop') return
                  updateCropFromPointer(event)
                }}
                onPointerUp={(event) => {
                  setDragging(false)
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                }}
                onPointerCancel={() => setDragging(false)}
              >
                <img
                  src={previewUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full select-none"
                  style={{
                    objectFit: previewObjectFit,
                    objectPosition: `${roundedX}% ${roundedY}%`,
                  }}
                />
                {mode === 'crop' ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.42)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.42)_1px,transparent_1px)] bg-[size:33.333%_33.333%]" />
                    <div
                      className="pointer-events-none absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/55 text-white shadow-lg"
                      style={{ left: `${roundedX}%`, top: `${roundedY}%` }}
                    >
                      <Move className="h-4 w-4" />
                    </div>
                  </>
                ) : null}
              </div>

              {mode === 'crop' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Horizontal {roundedX}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={roundedX}
                      onChange={(event) => setCrop((current) => ({ ...current, x: clampPercent(event.target.value) }))}
                      className="block w-full accent-primary"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Vertical {roundedY}%
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={roundedY}
                      onChange={(event) => setCrop((current) => ({ ...current, y: clampPercent(event.target.value) }))}
                      className="block w-full accent-primary"
                    />
                  </label>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Resize keeps the whole image visible by stretching it into the banner frame.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setCropModalOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
