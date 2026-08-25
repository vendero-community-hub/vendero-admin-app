'use client'

import * as React from 'react'
import {
  CheckCircle2,
  FolderCog,
  ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
  Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'
import { cn } from '@/lib/utils'

export type ImageLibraryPayload = Record<string, unknown> | null

type ImageTypeOption = {
  value: string
  label: string
}

type ReferenceCategory = {
  id: string
  apiId: string
  name: string
  slug: string
  imageType: string
  description: string | null
  sortOrder: number
  isActive: boolean
  itemCount: number
}

type ReferenceItem = {
  id: string
  apiId: string
  title: string
  imageType: string
  categoryId: string
  categoryName: string | null
  description: string | null
  imageUrl: string
  sortOrder: number
  isActive: boolean
  updatedAt: string | null
}

type LibraryData = {
  imageTypes: ImageTypeOption[]
  categories: ReferenceCategory[]
  items: ReferenceItem[]
  summary: Record<string, unknown>
}

type ItemForm = {
  apiId?: string
  title: string
  imageType: string
  categoryId: string
  description: string
  sortOrder: string
  isActive: boolean
  imageUrl: string
  image: File | null
}

type CategoryForm = {
  apiId?: string
  name: string
  description: string
  sortOrder: string
  isActive: boolean
}

const FIXED_IMAGE_TYPES: ImageTypeOption[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'social_post', label: 'Social Post' },
  { value: 'website_image', label: 'Website Image' },
  { value: 'instagram_story', label: 'Instagram Story' },
  { value: 'whatsapp_marketing_graphic', label: 'WhatsApp Marketing' },
]

const EMPTY_CATEGORY_FORM: CategoryForm = {
  name: '',
  description: '',
  sortOrder: '100',
  isActive: true,
}

function emptyItemForm(imageType: string): ItemForm {
  return {
    title: '',
    imageType,
    categoryId: '',
    description: '',
    sortOrder: '100',
    isActive: true,
    imageUrl: '',
    image: null,
  }
}

function recordValue(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function textValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function booleanValue(value: unknown, fallback = true) {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') return value !== 'false' && value !== '0'
  return Boolean(value)
}

function labelForType(value: string) {
  return (
    FIXED_IMAGE_TYPES.find((option) => option.value === value)?.label ??
    value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  )
}

function mergeImageTypes(value: unknown) {
  const serverTypes = (Array.isArray(value) ? value : [])
    .map((entry): ImageTypeOption | null => {
      if (typeof entry === 'string') {
        return { value: entry, label: labelForType(entry) }
      }

      const row = recordValue(entry)
      const typeValue = textValue(row.value ?? row.code ?? row.key ?? row.imageType ?? row.type)
      if (!typeValue) return null
      return {
        value: typeValue,
        label: textValue(row.label ?? row.name ?? row.title) || labelForType(typeValue),
      }
    })
    .filter((entry): entry is ImageTypeOption => Boolean(entry))

  const serverByValue = new Map(serverTypes.map((entry) => [entry.value, entry]))
  const merged = FIXED_IMAGE_TYPES.map((entry) => serverByValue.get(entry.value) ?? entry)

  for (const entry of serverTypes) {
    if (!merged.some((candidate) => candidate.value === entry.value)) merged.push(entry)
  }

  return merged
}

function normalizeLibraryData(payload: unknown, requestedImageType: string): LibraryData {
  const body = recordValue(payload)
  const rawCategories = Array.isArray(body.categories) ? body.categories : []
  const categories = rawCategories
    .map((entry): ReferenceCategory | null => {
      const row = recordValue(entry)
      const databaseId = textValue(row.id ?? row.publicId ?? row.public_id)
      const apiId = textValue(row.publicId ?? row.public_id ?? row.id)
      const name = textValue(row.name ?? row.title)
      if (!databaseId || !apiId || !name) return null

      return {
        id: databaseId,
        apiId,
        name,
        slug: textValue(row.slug),
        imageType:
          textValue(row.imageType ?? row.image_type ?? row.type) || requestedImageType,
        description: textValue(row.description) || null,
        sortOrder: numberValue(row.sortOrder ?? row.sort_order, 0),
        isActive: booleanValue(row.isActive ?? row.is_active, true),
        itemCount: numberValue(row.itemCount ?? row.item_count ?? row.imageCount ?? row.count, 0),
      }
    })
    .filter((entry): entry is ReferenceCategory => Boolean(entry))
    .filter((entry) => entry.imageType === requestedImageType)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))

  const rawItems = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.images)
      ? body.images
      : []
  const items = rawItems
    .map((entry): ReferenceItem | null => {
      const row = recordValue(entry)
      const category = recordValue(row.category)
      const databaseId = textValue(row.id ?? row.publicId ?? row.public_id)
      const apiId = textValue(row.publicId ?? row.public_id ?? row.id)
      const imageUrl = textValue(
        row.imageUrl ?? row.image_url ?? row.url ?? row.fileUrl ?? row.publicUrl
      )
      if (!databaseId || !apiId || !imageUrl) return null

      return {
        id: databaseId,
        apiId,
        title:
          textValue(row.title ?? row.name) ||
          textValue(category.name) ||
          'Reference image',
        imageType:
          textValue(row.imageType ?? row.image_type ?? row.type) || requestedImageType,
        categoryId: textValue(
          row.categoryId ??
            row.category_id ??
            category.id ??
            category.publicId ??
            category.public_id
        ),
        categoryName: textValue(row.categoryName ?? row.category_name ?? category.name) || null,
        description:
          textValue(row.description ?? row.promptGuidance ?? row.prompt_guidance) || null,
        imageUrl,
        sortOrder: numberValue(row.sortOrder ?? row.sort_order, 0),
        isActive: booleanValue(row.isActive ?? row.is_active, true),
        updatedAt: textValue(row.updatedAt ?? row.updated_at) || null,
      }
    })
    .filter((entry): entry is ReferenceItem => Boolean(entry))
    .filter((entry) => entry.imageType === requestedImageType)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title))

  return {
    imageTypes: mergeImageTypes(body.imageTypes ?? body.image_types),
    categories,
    items,
    summary: recordValue(body.summary),
  }
}

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))
  return tokenEntry?.split('=')[1] ?? null
}

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload
}

function requestError(payload: any, fallback: string) {
  return (
    payload?.message ??
    payload?.error?.message ??
    payload?.data?.message ??
    payload?.errors?.[0]?.message ??
    fallback
  )
}

async function requestAdmin(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const token = getAdminToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(requestError(payload, response.statusText || 'Request failed'))
  }
  return unwrapPayload(payload)
}

async function fetchLibrary(imageType: string) {
  let combined: LibraryData | null = null
  const itemById = new Map<string, ReferenceItem>()

  for (let page = 1; page <= 100; page += 1) {
    const search = new URLSearchParams({
      imageType,
      includeArchived: 'true',
      perPage: '100',
      page: String(page),
    })
    const payload = await requestAdmin(
      `/api/v1/admin/ai/reference-library?${search.toString()}`
    )
    const nextPage = normalizeLibraryData(payload, imageType)
    if (!combined) combined = nextPage
    for (const item of nextPage.items) itemById.set(item.apiId, item)

    const meta = recordValue(recordValue(payload).meta)
    const lastPage = numberValue(meta.lastPage ?? meta.last_page, page)
    if (nextPage.items.length < 100 || page >= lastPage) break
  }

  const data =
    combined ??
    ({
      imageTypes: mergeImageTypes([]),
      categories: [],
      items: [],
      summary: {},
    } satisfies LibraryData)

  return {
    ...data,
    items: [...itemById.values()].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
    ),
  }
}

function formatDate(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function categoryIdentitySet(category: ReferenceCategory) {
  return new Set([category.id, category.apiId, category.slug].filter(Boolean))
}

function ModalFrame({
  title,
  description,
  children,
  onClose,
  widthClass = 'max-w-3xl',
}: {
  title: string
  description: string
  children: React.ReactNode
  onClose: () => void
  widthClass?: string
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl',
          widthClass
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-lg font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ImageLibraryPanel({
  initialData,
  initialImageType,
}: {
  initialData: ImageLibraryPayload
  initialImageType: string
}) {
  const initialLibrary = React.useMemo(
    () => normalizeLibraryData(initialData, initialImageType),
    [initialData, initialImageType]
  )
  const [data, setData] = React.useState<LibraryData>(initialLibrary)
  const [activeImageType, setActiveImageType] = React.useState(initialImageType)
  const [activeCategory, setActiveCategory] = React.useState('all')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(
    initialData ? null : 'The image library could not be loaded. Retry after the API is available.'
  )
  const [notice, setNotice] = React.useState<string | null>(null)
  const [itemModalOpen, setItemModalOpen] = React.useState(false)
  const [itemForm, setItemForm] = React.useState<ItemForm>(() =>
    emptyItemForm(initialImageType)
  )
  const [itemFormCategories, setItemFormCategories] = React.useState<ReferenceCategory[]>(
    initialLibrary.categories
  )
  const [itemFormCategoriesLoading, setItemFormCategoriesLoading] = React.useState(false)
  const [itemWorking, setItemWorking] = React.useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = React.useState(false)
  const [categoryForm, setCategoryForm] =
    React.useState<CategoryForm>(EMPTY_CATEGORY_FORM)
  const [categoryWorking, setCategoryWorking] = React.useState<string | null>(null)
  const requestSequence = React.useRef(0)
  const actionModal = useActionModal()

  const imageTypes = React.useMemo(
    () => mergeImageTypes(data.imageTypes),
    [data.imageTypes]
  )
  const activeImageTypeLabel = labelForType(activeImageType)
  const selectedCategory = React.useMemo(
    () => data.categories.find((category) => category.apiId === activeCategory) ?? null,
    [activeCategory, data.categories]
  )
  const visibleItems = React.useMemo(() => {
    if (!selectedCategory) return data.items
    const identities = categoryIdentitySet(selectedCategory)
    return data.items.filter(
      (item) =>
        identities.has(item.categoryId) ||
        (item.categoryName && item.categoryName === selectedCategory.name)
    )
  }, [data.items, selectedCategory])
  const activeItemCount = data.items.filter((item) => item.isActive).length
  const previewUrl = React.useMemo(
    () => (itemForm.image ? URL.createObjectURL(itemForm.image) : itemForm.imageUrl),
    [itemForm.image, itemForm.imageUrl]
  )

  React.useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function refresh(imageType = activeImageType) {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError(null)
    try {
      const nextData = await fetchLibrary(imageType)
      if (sequence !== requestSequence.current) return
      setData(nextData)
      setActiveCategory((current) =>
        current === 'all' || nextData.categories.some((category) => category.apiId === current)
          ? current
          : 'all'
      )
    } catch (refreshError) {
      if (sequence !== requestSequence.current) return
      setError(
        refreshError instanceof Error ? refreshError.message : 'Unable to load image library.'
      )
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }

  function selectImageType(imageType: string) {
    if (imageType === activeImageType) return
    setActiveImageType(imageType)
    setActiveCategory('all')
    setNotice(null)
    void refresh(imageType)
  }

  function openCreateItem() {
    setItemForm(emptyItemForm(activeImageType))
    setItemFormCategories(data.categories)
    setItemModalOpen(true)
    setError(null)
  }

  function openEditItem(item: ReferenceItem) {
    const matchedCategory = data.categories.find((category) => {
      const identities = categoryIdentitySet(category)
      return identities.has(item.categoryId) || category.name === item.categoryName
    })
    setItemForm({
      apiId: item.apiId,
      title: item.title,
      imageType: item.imageType,
      categoryId: matchedCategory?.id ?? item.categoryId,
      description: item.description ?? '',
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
      imageUrl: item.imageUrl,
      image: null,
    })
    setItemFormCategories(data.categories)
    setItemModalOpen(true)
    setError(null)
  }

  async function changeItemFormType(imageType: string) {
    setItemForm((current) => ({ ...current, imageType, categoryId: '' }))
    if (imageType === activeImageType) {
      setItemFormCategories(data.categories)
      return
    }

    setItemFormCategoriesLoading(true)
    try {
      const nextData = await fetchLibrary(imageType)
      setItemFormCategories(nextData.categories)
    } catch (categoryError) {
      setError(
        categoryError instanceof Error
          ? categoryError.message
          : 'Unable to load categories for this image type.'
      )
      setItemFormCategories([])
    } finally {
      setItemFormCategoriesLoading(false)
    }
  }

  function chooseItemImage(file: File | null) {
    if (!file) {
      setItemForm((current) => ({ ...current, image: null }))
      return
    }
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      setError('Reference images must be PNG, JPG, or WEBP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Reference image must be 5 MB or smaller.')
      return
    }
    setError(null)
    setItemForm((current) => ({ ...current, image: file }))
  }

  async function saveItem() {
    if (!itemForm.title.trim()) {
      setError('Image title is required.')
      return
    }
    if (!itemForm.categoryId) {
      setError('Select a category for this reference image.')
      return
    }
    if (!itemForm.description.trim()) {
      setError('Add AI guidance describing what the example should teach the model.')
      return
    }
    if (!itemForm.apiId && !itemForm.image) {
      setError('Choose an image to upload.')
      return
    }

    const formData = new FormData()
    if (itemForm.image) formData.append('image', itemForm.image)
    formData.append('title', itemForm.title.trim())
    formData.append('imageType', itemForm.imageType)
    formData.append('categoryId', itemForm.categoryId)
    formData.append('description', itemForm.description.trim())
    formData.append('sortOrder', String(numberValue(itemForm.sortOrder, 0)))
    formData.append('isActive', String(itemForm.isActive))

    setItemWorking(true)
    setError(null)
    setNotice(null)
    try {
      await requestAdmin(
        itemForm.apiId
          ? `/api/v1/admin/ai/reference-library/items/${encodeURIComponent(itemForm.apiId)}`
          : '/api/v1/admin/ai/reference-library/items',
        {
          method: itemForm.apiId ? 'PUT' : 'POST',
          body: formData,
        }
      )
      const savedType = itemForm.imageType
      setItemModalOpen(false)
      setActiveImageType(savedType)
      setActiveCategory('all')
      setNotice(itemForm.apiId ? 'Reference image updated.' : 'Reference image added.')
      await refresh(savedType)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save image.')
    } finally {
      setItemWorking(false)
    }
  }

  async function deleteItem(item: ReferenceItem) {
    const confirmed = await actionModal.confirm({
      title: `Delete ${item.title}?`,
      description:
        'This removes the example from the mobile composer. Generated images that previously used it are not changed.',
      confirmLabel: 'Delete image',
      variant: 'danger',
    })
    if (!confirmed) return

    setError(null)
    setNotice(null)
    try {
      await requestAdmin(
        `/api/v1/admin/ai/reference-library/items/${encodeURIComponent(item.apiId)}`,
        { method: 'DELETE' }
      )
      setNotice('Reference image deleted.')
      await refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete image.')
    }
  }

  function openCategoryManager() {
    setCategoryForm(EMPTY_CATEGORY_FORM)
    setCategoryModalOpen(true)
    setError(null)
  }

  function editCategory(category: ReferenceCategory) {
    setCategoryForm({
      apiId: category.apiId,
      name: category.name,
      description: category.description ?? '',
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    })
  }

  async function saveCategory() {
    if (!categoryForm.name.trim()) {
      setError('Category name is required.')
      return
    }

    const body = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
      imageType: activeImageType,
      sortOrder: numberValue(categoryForm.sortOrder, 0),
      isActive: categoryForm.isActive,
    }

    setCategoryWorking('save')
    setError(null)
    setNotice(null)
    try {
      await requestAdmin(
        categoryForm.apiId
          ? `/api/v1/admin/ai/reference-library/categories/${encodeURIComponent(categoryForm.apiId)}`
          : '/api/v1/admin/ai/reference-library/categories',
        {
          method: categoryForm.apiId ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        }
      )
      setCategoryForm(EMPTY_CATEGORY_FORM)
      setNotice(categoryForm.apiId ? 'Category updated.' : 'Category created.')
      await refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save category.')
    } finally {
      setCategoryWorking(null)
    }
  }

  async function deleteCategory(category: ReferenceCategory) {
    const confirmed = await actionModal.confirm({
      title: `Delete ${category.name}?`,
      description:
        category.itemCount > 0
          ? `This category contains ${category.itemCount} image(s). The API may require you to move or delete them first.`
          : 'This category will no longer appear as a mobile library tag.',
      confirmLabel: 'Delete category',
      variant: 'danger',
    })
    if (!confirmed) return

    setCategoryWorking(`delete-${category.apiId}`)
    setError(null)
    setNotice(null)
    try {
      await requestAdmin(
        `/api/v1/admin/ai/reference-library/categories/${encodeURIComponent(category.apiId)}`,
        { method: 'DELETE' }
      )
      if (activeCategory === category.apiId) setActiveCategory('all')
      setNotice('Category deleted.')
      await refresh()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete category.'
      )
    } finally {
      setCategoryWorking(null)
    }
  }

  return (
    <>
      <section className="space-y-6">
        {error ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  References
                </p>
                <p className="mt-1 text-2xl font-semibold">{data.items.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Active
                </p>
                <p className="mt-1 text-2xl font-semibold">{activeItemCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-300">
                <Tags className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Categories
                </p>
                <p className="mt-1 text-2xl font-semibold">{data.categories.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle>Reference gallery</CardTitle>
                <CardDescription className="mt-1 max-w-2xl leading-6">
                  The selected image type controls which category tags and examples the mobile
                  composer requests.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  Refresh
                </Button>
                <Button type="button" variant="outline" onClick={openCategoryManager}>
                  <FolderCog className="h-4 w-4" />
                  Manage categories
                </Button>
                <Button type="button" onClick={openCreateItem}>
                  <Plus className="h-4 w-4" />
                  Add reference
                </Button>
              </div>
            </div>

            <div className="-mx-1 overflow-x-auto px-1">
              <div className="flex w-max gap-2 pb-1">
                {imageTypes.map((imageType) => {
                  const active = activeImageType === imageType.value
                  return (
                    <button
                      key={imageType.value}
                      type="button"
                      onClick={() => selectImageType(imageType.value)}
                      className={cn(
                        'inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition',
                        active
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background/60 text-foreground hover:border-foreground/50'
                      )}
                    >
                      {imageType.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-1 overflow-x-auto px-1">
                <div className="flex w-max gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      activeCategory === 'all'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background/50 text-muted-foreground'
                    )}
                  >
                    All <span className="ml-1 opacity-75">{data.items.length}</span>
                  </button>
                  {data.categories.map((category) => {
                    const identities = categoryIdentitySet(category)
                    const count =
                      category.itemCount ||
                      data.items.filter(
                        (item) =>
                          identities.has(item.categoryId) ||
                          item.categoryName === category.name
                      ).length
                    return (
                      <button
                        key={category.apiId}
                        type="button"
                        onClick={() => setActiveCategory(category.apiId)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          activeCategory === category.apiId
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background/50 text-muted-foreground hover:text-foreground',
                          !category.isActive && 'opacity-60'
                        )}
                      >
                        {category.name} <span className="ml-1 opacity-75">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {activeImageTypeLabel} · {visibleItems.length} shown
              </p>
            </div>

            {loading ? (
              <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-border">
                <div className="text-center text-sm text-muted-foreground">
                  <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />
                  Loading {activeImageTypeLabel.toLowerCase()} references…
                </div>
              </div>
            ) : !data.categories.length ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Tags className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">Create the first category</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  Categories become the dynamic tags users browse inside the reference-image
                  bottom sheet.
                </p>
                <Button type="button" className="mt-4" onClick={openCategoryManager}>
                  <Plus className="h-4 w-4" />
                  Create category
                </Button>
              </div>
            ) : !visibleItems.length ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">No reference images here yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  Add a strong example with plain-language AI guidance so vendors can understand
                  the expected result before generating.
                </p>
                <Button type="button" className="mt-4" onClick={openCreateItem}>
                  <Upload className="h-4 w-4" />
                  Upload reference
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item) => (
                  <article
                    key={item.apiId}
                    className="group overflow-hidden rounded-xl border border-border/70 bg-background/30"
                  >
                    <div className="grid aspect-square place-items-center overflow-hidden bg-muted/20 p-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full rounded-lg object-contain transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="space-y-3 border-t border-border/60 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={item.isActive ? 'success' : 'secondary'}>
                          {item.isActive ? 'Active' : 'Hidden'}
                        </Badge>
                        {item.categoryName ? (
                          <Badge variant="outline">{item.categoryName}</Badge>
                        ) : null}
                      </div>
                      <div>
                        <h3 className="line-clamp-2 font-semibold">{item.title}</h3>
                        {item.description ? (
                          <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-amber-300">
                            Add AI guidance before publishing this example.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <p className="text-xs text-muted-foreground">
                          Sort {item.sortOrder}
                          {formatDate(item.updatedAt) ? ` · ${formatDate(item.updatedAt)}` : ''}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${item.title}`}
                            onClick={() => openEditItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-300 hover:text-rose-200"
                            aria-label={`Delete ${item.title}`}
                            onClick={() => void deleteItem(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {itemModalOpen ? (
        <ModalFrame
          title={itemForm.apiId ? 'Edit reference image' : 'Add reference image'}
          description="The image gives visual direction; the description is sent as AI guidance with the vendor prompt."
          onClose={() => setItemModalOpen(false)}
          widthClass="max-w-4xl"
        >
          {error ? (
            <div
              role="alert"
              className="mx-5 mt-4 shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          ) : null}
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-border bg-muted/20 p-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    <ImageIcon className="mx-auto mb-2 h-8 w-8" />
                    Image preview
                  </div>
                )}
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">
                  {itemForm.apiId ? 'Replace image (optional)' : 'Reference image'}
                </span>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    chooseItemImage(event.target.files?.[0] ?? null)
                    event.target.value = ''
                  }}
                />
                <span className="block text-xs leading-5 text-muted-foreground">
                  PNG, JPG, or WEBP up to 5 MB. Mixed aspect ratios are supported.
                </span>
              </label>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Title</span>
                <Input
                  value={itemForm.title}
                  onChange={(event) =>
                    setItemForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Minimal luxury travel logo"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Image type</span>
                  <select
                    value={itemForm.imageType}
                    onChange={(event) => void changeItemFormType(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {imageTypes.map((imageType) => (
                      <option key={imageType.value} value={imageType.value}>
                        {imageType.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Category</span>
                  <select
                    value={itemForm.categoryId}
                    disabled={itemFormCategoriesLoading}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                  >
                    <option value="">
                      {itemFormCategoriesLoading ? 'Loading categories…' : 'Select category'}
                    </option>
                    {itemFormCategories.map((category) => (
                      <option key={category.apiId} value={category.id}>
                        {category.name}{category.isActive ? '' : ' (hidden)'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">AI guidance description</span>
                <textarea
                  value={itemForm.description}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={7}
                  placeholder="Describe the composition, subject, lighting, typography, colors, and visual style the AI should learn from this example."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/60"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Sort order</span>
                  <Input
                    type="number"
                    value={itemForm.sortOrder}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-input px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={itemForm.isActive}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Show in mobile composer
                </label>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={itemWorking} onClick={() => void saveItem()}>
              {itemWorking ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {itemWorking
                ? 'Saving…'
                : itemForm.apiId
                  ? 'Update reference'
                  : 'Add reference'}
            </Button>
          </div>
        </ModalFrame>
      ) : null}

      {categoryModalOpen ? (
        <ModalFrame
          title={`${activeImageTypeLabel} categories`}
          description="These category names appear as dynamic filter tags in the mobile library."
          onClose={() => setCategoryModalOpen(false)}
          widthClass="max-w-4xl"
        >
          {error ? (
            <div
              role="alert"
              className="mx-5 mt-4 shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          ) : null}
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4 rounded-xl border border-border/70 bg-card/50 p-4">
              <div>
                <p className="font-semibold">
                  {categoryForm.apiId ? 'Edit category' : 'Create category'}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Category is automatically assigned to {activeImageTypeLabel}.
                </p>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Name</span>
                <Input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Minimal"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Admin description</span>
                <textarea
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Optional note about what belongs in this category."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/60"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="font-medium">Sort order</span>
                  <Input
                    type="number"
                    value={categoryForm.sortOrder}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex min-h-10 items-center gap-3 self-end rounded-md border border-input px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Active tag
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void saveCategory()}
                  disabled={categoryWorking === 'save'}
                >
                  {categoryWorking === 'save' ? 'Saving…' : categoryForm.apiId ? 'Save category' : 'Create category'}
                </Button>
                {categoryForm.apiId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCategoryForm(EMPTY_CATEGORY_FORM)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Current tags</p>
              {data.categories.length ? (
                data.categories.map((category) => (
                  <article
                    key={category.apiId}
                    className="rounded-xl border border-border/70 bg-background/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{category.name}</p>
                          <Badge variant={category.isActive ? 'success' : 'secondary'}>
                            {category.isActive ? 'Active' : 'Hidden'}
                          </Badge>
                        </div>
                        {category.description ? (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {category.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {category.itemCount} image(s) · sort {category.sortOrder}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => editCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-300"
                          aria-label={`Delete ${category.name}`}
                          disabled={
                            categoryWorking === `delete-${category.apiId}`
                          }
                          onClick={() => void deleteCategory(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No categories for this image type.
                </div>
              )}
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {actionModal.modal}
    </>
  )
}
