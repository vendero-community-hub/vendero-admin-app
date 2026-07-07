'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type ActionVariant = 'default' | 'danger'
type ImagePickerTab = 'storage' | 'upload'

type StorageImageFile = {
  key: string
  name: string
  folder?: string
  scope?: string | null
  sizeBytes?: number
  lastModified?: string | null
  url: string | null
}

export type ActionModalField = {
  name: string
  label: string
  defaultValue?: string | boolean
  description?: string
  placeholder?: string
  type?: 'text' | 'textarea' | 'checkbox' | 'switch' | 'image'
  required?: boolean
  imageScope?: string
  storagePrefix?: string
}

export type ActionModalResult = {
  confirmed: boolean
  values: Record<string, string>
}

type ActionModalRequest = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ActionVariant
  fields?: ActionModalField[]
  resolve: (result: ActionModalResult) => void
}

type OpenActionModalOptions = Omit<ActionModalRequest, 'resolve'>

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function requestErrorMessage(payload: any, fallback: string) {
  return (
    [
      payload?.message,
      payload?.error?.message,
      payload?.data?.message,
      payload?.data?.error?.message,
      payload?.errors?.[0]?.message,
      payload?.data?.errors?.[0]?.message,
      payload?.error,
      payload?.errorCode,
    ].find((candidate) => typeof candidate === 'string' && candidate.trim()) ?? fallback
  )
}

function isImageFile(file: StorageImageFile) {
  const source = `${file.name} ${file.key} ${file.url ?? ''}`.toLowerCase()
  return /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(source)
}

function formatBytes(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

async function requestStorageImages(prefix: string) {
  const token = getAdminToken()
  const params = new URLSearchParams({
    prefix,
    limit: '120',
    includeUsage: 'false',
  })
  const response = await fetch(`/api/v1/admin/storage?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(requestErrorMessage(payload, response.statusText || 'Unable to load storage images'))
  }
  const data = unwrapPayload(payload)
  const files = Array.isArray(data?.files) ? data.files : []
  return files.filter(isImageFile) as StorageImageFile[]
}

async function uploadPickerImage(file: File, scope: string) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be 5 MB or smaller.')
  }
  const token = getAdminToken()
  const formData = new FormData()
  formData.append('scope', scope || 'cab')
  formData.append('file', file)
  const response = await fetch('/api/v1/admin/media/upload', {
    method: 'POST',
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(requestErrorMessage(payload, response.statusText || 'Image upload failed'))
  }
  const uploaded = unwrapPayload(payload)
  const url = uploaded?.url ?? uploaded?.fileUrl ?? uploaded?.publicUrl
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Upload finished but no image URL was returned.')
  }
  return url.trim()
}

export function useActionModal() {
  const [request, setRequest] = React.useState<ActionModalRequest | null>(null)

  const open = React.useCallback((options: OpenActionModalOptions) => {
    return new Promise<ActionModalResult>((resolve) => {
      setRequest({
        ...options,
        resolve,
      })
    })
  }, [])

  const confirm = React.useCallback(
    async (options: Omit<OpenActionModalOptions, 'fields'>) => {
      const result = await open(options)
      return result.confirmed
    },
    [open]
  )

  const prompt = React.useCallback(
    async (
      options: Omit<OpenActionModalOptions, 'fields'> & {
        label?: string
        defaultValue?: string
        placeholder?: string
        required?: boolean
        textarea?: boolean
      }
    ) => {
      const result = await open({
        ...options,
        fields: [
          {
            name: 'value',
            label: options.label ?? options.title,
            defaultValue: options.defaultValue ?? '',
            placeholder: options.placeholder,
            required: options.required,
            type: options.textarea ? 'textarea' : 'text',
          },
        ],
      })
      return result.confirmed ? result.values.value ?? '' : null
    },
    [open]
  )

  const form = React.useCallback(
    async (options: OpenActionModalOptions & { fields: ActionModalField[] }) => open(options),
    [open]
  )

  const close = React.useCallback(
    (confirmed: boolean, values: Record<string, string>) => {
      setRequest((current) => {
        current?.resolve({ confirmed, values })
        return null
      })
    },
    []
  )

  const modal = request ? <ActionModal request={request} onClose={close} /> : null

  return { confirm, prompt, form, modal }
}

function ActionModal({
  request,
  onClose,
}: {
  request: ActionModalRequest
  onClose: (confirmed: boolean, values: Record<string, string>) => void
}) {
  const fields = request.fields ?? []
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.name] =
        typeof field.defaultValue === 'boolean'
          ? field.defaultValue
            ? 'true'
            : 'false'
          : field.defaultValue ?? ''
      return acc
    }, {})
  )
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null)
  const [imagePickerField, setImagePickerField] = React.useState<ActionModalField | null>(null)
  const [imagePickerTab, setImagePickerTab] = React.useState<ImagePickerTab>('storage')
  const [storageImages, setStorageImages] = React.useState<StorageImageFile[]>([])
  const [imagePickerMessage, setImagePickerMessage] = React.useState<string | null>(null)
  const [imagePickerLoading, setImagePickerLoading] = React.useState(false)
  const [imageUploading, setImageUploading] = React.useState(false)

  function fieldLayoutClass(field: ActionModalField) {
    if (field.type === 'textarea' || field.type === 'image') {
      return 'md:col-span-2 xl:col-span-3'
    }
    if (field.type === 'checkbox' || field.type === 'switch') {
      return 'md:col-span-1'
    }
    return ''
  }

  function modalWidthClass() {
    if (fields.length > 5) return 'max-w-6xl'
    if (fields.length > 1) return 'max-w-4xl'
    return 'max-w-lg'
  }

  async function loadStorageImages(field = imagePickerField) {
    if (!field) return
    setImagePickerLoading(true)
    setImagePickerMessage(null)
    try {
      const files = await requestStorageImages(field.storagePrefix ?? 'uploads/')
      setStorageImages(files)
    } catch (error) {
      setImagePickerMessage(error instanceof Error ? error.message : 'Unable to load storage images.')
    } finally {
      setImagePickerLoading(false)
    }
  }

  function openImagePicker(field: ActionModalField, tab: ImagePickerTab) {
    setImagePickerField(field)
    setImagePickerTab(tab)
    setImagePickerMessage(null)
    if (tab === 'storage') void loadStorageImages(field)
  }

  function selectImageUrl(url: string) {
    if (!imagePickerField) return
    setValues((current) => ({ ...current, [imagePickerField.name]: url }))
    setImagePickerField(null)
  }

  async function handleImageUpload(file: File | null | undefined) {
    if (!file || !imagePickerField) return
    setImageUploading(true)
    setImagePickerMessage(null)
    try {
      const url = await uploadPickerImage(file, imagePickerField.imageScope ?? 'cab')
      setValues((current) => ({ ...current, [imagePickerField.name]: url }))
      setImagePickerMessage('Image uploaded and selected.')
      setImagePickerField(null)
    } catch (error) {
      setImagePickerMessage(error instanceof Error ? error.message : 'Image upload failed.')
    } finally {
      setImageUploading(false)
    }
  }

  function submit() {
    const missingField = fields.find((field) => {
      if (!field.required) return false
      if (field.type === 'checkbox' || field.type === 'switch') return values[field.name] !== 'true'
      return !values[field.name]?.trim()
    })
    if (missingField) {
      setValidationMessage(`${missingField.label} is required.`)
      return
    }
    onClose(true, values)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
      <div className={cn('flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl', modalWidthClass())}>
        <div className="shrink-0 border-b border-border px-5 py-4">
          <p className="text-lg font-semibold leading-6">{request.title}</p>
          {request.description ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.description}</p>
          ) : null}
        </div>
        {fields.length ? (
          <div className="grid min-h-0 grid-cols-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => (
              <div key={field.name} className={cn('block space-y-2 text-sm', fieldLayoutClass(field))}>
                {field.type === 'checkbox' ? (
                  <Checkbox
                    checked={values[field.name] === 'true'}
                    onCheckedChange={(checked) =>
                      setValues((current) => ({ ...current, [field.name]: checked ? 'true' : 'false' }))
                    }
                    label={field.label}
                    description={field.description}
                  />
                ) : field.type === 'switch' ? (
                  <Switch
                    checked={values[field.name] === 'true'}
                    onCheckedChange={(checked) =>
                      setValues((current) => ({ ...current, [field.name]: checked ? 'true' : 'false' }))
                    }
                    label={field.label}
                    description={field.description}
                  />
                ) : field.type === 'textarea' ? (
                  <>
                    <span className="font-medium">{field.label}</span>
                  <textarea
                    value={values[field.name] ?? ''}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    className={cn(
                      'min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
                    )}
                  />
                  </>
                ) : field.type === 'image' ? (
                  <>
                    <span className="font-medium">{field.label}</span>
                    <div className="grid gap-2">
                      {values[field.name] ? (
                        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-2">
                          <img
                            alt=""
                            className="h-14 w-16 rounded-md border border-border bg-background object-contain"
                            src={values[field.name]}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium">Selected image</p>
                            <p className="truncate text-xs text-muted-foreground">{values[field.name]}</p>
                          </div>
                        </div>
                      ) : null}
                      <Input
                        value={values[field.name] ?? ''}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.name]: event.target.value }))
                        }
                        placeholder={field.placeholder ?? 'Image URL'}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openImagePicker(field, 'storage')}>
                          Choose image
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => openImagePicker(field, 'upload')}>
                          Upload image
                        </Button>
                        {values[field.name] ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setValues((current) => ({ ...current, [field.name]: '' }))}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{field.label}</span>
                  <Input
                    value={values[field.name] ?? ''}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                  </>
                )}
              </div>
            ))}
            {validationMessage ? (
              <p className="text-sm text-rose-300 md:col-span-2 xl:col-span-3">{validationMessage}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onClose(false, values)}>
            {request.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            type="button"
            variant={request.variant === 'danger' ? 'outline' : 'default'}
            className={request.variant === 'danger' ? 'border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive' : undefined}
            onClick={submit}
          >
            {request.confirmLabel ?? 'Continue'}
          </Button>
        </div>
      </div>
      {imagePickerField ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <p className="text-lg font-semibold leading-6">Select image</p>
                <p className="mt-1 text-sm text-muted-foreground">{imagePickerField.label}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setImagePickerField(null)}>
                Close
              </Button>
            </div>
            <div className="border-b border-border px-5 py-3">
              <div className="inline-flex rounded-md border border-border bg-muted/20 p-1">
                <button
                  type="button"
                  className={cn(
                    'rounded px-3 py-1.5 text-sm font-medium',
                    imagePickerTab === 'storage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => {
                    setImagePickerTab('storage')
                    void loadStorageImages()
                  }}
                >
                  Choose in storage
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded px-3 py-1.5 text-sm font-medium',
                    imagePickerTab === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setImagePickerTab('upload')}
                >
                  Upload image
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
              {imagePickerMessage ? (
                <p className="mb-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  {imagePickerMessage}
                </p>
              ) : null}
              {imagePickerTab === 'storage' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Images from {imagePickerField.storagePrefix ?? 'uploads/'}
                    </p>
                    <Button type="button" size="sm" variant="outline" disabled={imagePickerLoading} onClick={() => void loadStorageImages()}>
                      {imagePickerLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>
                  {storageImages.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {storageImages.map((file) => (
                        <button
                          key={file.key}
                          type="button"
                          className="overflow-hidden rounded-lg border border-border bg-muted/10 text-left transition hover:border-primary"
                          onClick={() => file.url ? selectImageUrl(file.url) : undefined}
                          disabled={!file.url}
                        >
                          <div className="grid h-32 place-items-center bg-background">
                            {file.url ? (
                              <img alt="" className="h-full w-full object-contain" src={file.url} />
                            ) : (
                              <span className="text-xs text-muted-foreground">No public URL</span>
                            )}
                          </div>
                          <div className="space-y-1 p-2">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">{file.key}</p>
                            <p className="text-[11px] text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                      {imagePickerLoading ? 'Loading storage images...' : 'No images found in storage.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-lg border border-dashed border-border p-5">
                    <p className="font-medium">Upload to R2 storage</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Scope: {imagePickerField.imageScope ?? 'cab'}. After upload, the returned public URL is selected automatically.
                    </p>
                    <Input
                      className="mt-4"
                      type="file"
                      accept="image/*"
                      disabled={imageUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        event.target.value = ''
                        void handleImageUpload(file)
                      }}
                    />
                  </div>
                  {imageUploading ? <p className="text-sm text-muted-foreground">Uploading image...</p> : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
