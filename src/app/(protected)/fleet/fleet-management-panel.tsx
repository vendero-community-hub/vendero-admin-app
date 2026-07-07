'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActionModal } from '@/components/ui/action-modal'

type CabModel = {
  id: number
  cabCategoryId: number
  categoryName: string
  name: string
  onewayPerKmRate: number
  roundTripPerKmRate: number
  isActive: boolean
  vendorCabCount: number
  tripCount: number
  createdAt: string
  updatedAt: string | null
}

type CabCategory = {
  id: number
  name: string
  onewayPerKmRate: number
  roundTripPerKmRate: number
  isActive: boolean
  modelCount: number
  vendorCabCount: number
  tripCount: number
  createdAt: string
  updatedAt: string | null
  models: CabModel[]
}

export type FleetData = {
  analytics: {
    categoryCount: number
    activeCategoryCount: number
    cabCount: number
    activeCabCount: number
    averageOnewayPerKmRate: number
    averageRoundTripPerKmRate: number
  }
  categories: CabCategory[]
}

type CategoryForm = {
  id?: number
  name: string
  onewayPerKmRate: string
  roundTripPerKmRate: string
  isActive: boolean
}

type CabForm = {
  id?: number
  cabCategoryId: string
  name: string
  onewayPerKmRate: string
  roundTripPerKmRate: string
  isActive: boolean
}

const emptyCategoryForm: CategoryForm = {
  name: '',
  onewayPerKmRate: '',
  roundTripPerKmRate: '',
  isActive: true,
}

function emptyCabForm(categoryId = ''): CabForm {
  return {
    cabCategoryId: categoryId,
    name: '',
    onewayPerKmRate: '',
    roundTripPerKmRate: '',
    isActive: true,
  }
}

function getAdminToken() {
  const tokenEntry = document.cookie
    .split('; ')
    .find((part) => part.startsWith('vendero_admin_access_token='))

  return tokenEntry?.split('=')[1] ?? null
}

async function requestJson(path: string, body?: Record<string, unknown>, method = 'POST') {
  const token = getAdminToken()
  const response = await fetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: token ? `Bearer ${token}` : '',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message ?? payload?.error?.message ?? 'Request failed')
  }

  return response.json().catch(() => ({}))
}

function unwrapFleetPayload(payload: unknown) {
  const record = payload as { data?: { data?: FleetData } | FleetData }
  return ((record.data as { data?: FleetData })?.data ?? record.data) as FleetData
}

function rateLabel(value: number) {
  return Number(value ?? 0).toFixed(2)
}

export function FleetManagementPanel({ initialData }: { initialData: FleetData | null }) {
  const [data, setData] = useState<FleetData>(
    initialData ?? {
      analytics: {
        categoryCount: 0,
        activeCategoryCount: 0,
        cabCount: 0,
        activeCabCount: 0,
        averageOnewayPerKmRate: 0,
        averageRoundTripPerKmRate: 0,
      },
      categories: [],
    }
  )
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm)
  const [cabForm, setCabForm] = useState<CabForm>(() => emptyCabForm(String(initialData?.categories?.[0]?.id ?? '')))
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const actionModal = useActionModal()

  const allCabs = useMemo(() => data.categories.flatMap((category) => category.models), [data.categories])

  async function refresh() {
    const payload = await requestJson('/api/v1/admin/fleet', undefined, 'GET')
    setData(unwrapFleetPayload(payload))
  }

  async function submitCategory() {
    setWorking('category')
    setMessage(null)
    try {
      const body = {
        name: categoryForm.name,
        onewayPerKmRate: Number(categoryForm.onewayPerKmRate || 0),
        roundTripPerKmRate: Number(categoryForm.roundTripPerKmRate || 0),
        isActive: categoryForm.isActive,
      }
      if (categoryForm.id) {
        await requestJson(`/api/v1/admin/fleet/categories/${categoryForm.id}`, body, 'PUT')
      } else {
        await requestJson('/api/v1/admin/fleet/categories', body)
      }
      setCategoryForm(emptyCategoryForm)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save category')
    } finally {
      setWorking(null)
    }
  }

  async function submitCab() {
    setWorking('cab')
    setMessage(null)
    try {
      const body = {
        cabCategoryId: Number(cabForm.cabCategoryId),
        name: cabForm.name,
        onewayPerKmRate: Number(cabForm.onewayPerKmRate || 0),
        roundTripPerKmRate: Number(cabForm.roundTripPerKmRate || 0),
        isActive: cabForm.isActive,
      }
      if (cabForm.id) {
        await requestJson(`/api/v1/admin/fleet/cabs/${cabForm.id}`, body, 'PUT')
      } else {
        await requestJson('/api/v1/admin/fleet/cabs', body)
      }
      setCabForm(emptyCabForm(cabForm.cabCategoryId))
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save cab')
    } finally {
      setWorking(null)
    }
  }

  async function deleteCategory(category: CabCategory) {
    const confirmed = await actionModal.confirm({
      title: `Delete ${category.name}?`,
      description: 'Deactivate instead if this category is already used.',
      confirmLabel: 'Delete category',
      variant: 'danger',
    })
    if (!confirmed) return
    setWorking(`category-delete-${category.id}`)
    setMessage(null)
    try {
      await requestJson(`/api/v1/admin/fleet/categories/${category.id}`, undefined, 'DELETE')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete category')
    } finally {
      setWorking(null)
    }
  }

  async function deleteCab(cab: CabModel) {
    const confirmed = await actionModal.confirm({
      title: `Delete ${cab.name}?`,
      description: 'Deactivate instead if this cab is already used.',
      confirmLabel: 'Delete cab',
      variant: 'danger',
    })
    if (!confirmed) return
    setWorking(`cab-delete-${cab.id}`)
    setMessage(null)
    try {
      await requestJson(`/api/v1/admin/fleet/cabs/${cab.id}`, undefined, 'DELETE')
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete cab')
    } finally {
      setWorking(null)
    }
  }

  function editCategory(category: CabCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      onewayPerKmRate: String(category.onewayPerKmRate),
      roundTripPerKmRate: String(category.roundTripPerKmRate),
      isActive: category.isActive,
    })
  }

  function editCab(cab: CabModel) {
    setCabForm({
      id: cab.id,
      cabCategoryId: String(cab.cabCategoryId),
      name: cab.name,
      onewayPerKmRate: String(cab.onewayPerKmRate),
      roundTripPerKmRate: String(cab.roundTripPerKmRate),
      isActive: cab.isActive,
    })
  }

  return (
    <>
    <section className="space-y-6">
      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>{categoryForm.id ? 'Edit Category' : 'Create Category'}</CardTitle>
            <CardDescription>Base fleet groups with default fare engine rates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Category name, e.g. Sedan"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={categoryForm.onewayPerKmRate}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, onewayPerKmRate: event.target.value }))
                }
                placeholder="One-way per km"
                type="number"
              />
              <Input
                value={categoryForm.roundTripPerKmRate}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, roundTripPerKmRate: event.target.value }))
                }
                placeholder="Round-trip per km"
                type="number"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={categoryForm.isActive}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Active for trip creation
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={submitCategory}
                disabled={working === 'category' || !categoryForm.name.trim()}
              >
                {working === 'category' ? 'Saving...' : categoryForm.id ? 'Save category' : 'Create category'}
              </Button>
              {categoryForm.id ? (
                <Button variant="outline" onClick={() => setCategoryForm(emptyCategoryForm)}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>{cabForm.id ? 'Edit Cab' : 'Create Cab'}</CardTitle>
            <CardDescription>Cab models can override category rates for trip pricing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <select
                value={cabForm.cabCategoryId}
                onChange={(event) => setCabForm((current) => ({ ...current, cabCategoryId: event.target.value }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select category</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Input
                value={cabForm.name}
                onChange={(event) => setCabForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Cab name, e.g. Toyota Etios"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={cabForm.onewayPerKmRate}
                onChange={(event) => setCabForm((current) => ({ ...current, onewayPerKmRate: event.target.value }))}
                placeholder="One-way per km"
                type="number"
              />
              <Input
                value={cabForm.roundTripPerKmRate}
                onChange={(event) =>
                  setCabForm((current) => ({ ...current, roundTripPerKmRate: event.target.value }))
                }
                placeholder="Round-trip per km"
                type="number"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cabForm.isActive}
                onChange={(event) => setCabForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active for trip creation
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={submitCab}
                disabled={working === 'cab' || !cabForm.name.trim() || !cabForm.cabCategoryId}
              >
                {working === 'cab' ? 'Saving...' : cabForm.id ? 'Save cab' : 'Create cab'}
              </Button>
              {cabForm.id ? (
                <Button variant="outline" onClick={() => setCabForm(emptyCabForm(cabForm.cabCategoryId))}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Cab Categories</CardTitle>
          <CardDescription>Category rates are used when a trip is priced by category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{category.name}</p>
                    <Badge variant={category.isActive ? 'success' : 'secondary'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One-way {rateLabel(category.onewayPerKmRate)} / km, round-trip{' '}
                    {rateLabel(category.roundTripPerKmRate)} / km
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {category.modelCount} cabs, {category.vendorCabCount} vendor vehicles, {category.tripCount} trips
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => editCategory(category)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={working === `category-delete-${category.id}`}
                    onClick={() => deleteCategory(category)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!data.categories.length ? (
            <p className="rounded-xl border border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
              No cab categories yet. Create one above to start pricing trips.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Cabs</CardTitle>
          <CardDescription>Cab-specific rates take priority when the trip uses a cab model.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {allCabs.map((cab) => (
            <div key={cab.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{cab.name}</p>
                    <Badge variant={cab.isActive ? 'success' : 'secondary'}>
                      {cab.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{cab.categoryName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One-way {rateLabel(cab.onewayPerKmRate)} / km, round-trip{' '}
                    {rateLabel(cab.roundTripPerKmRate)} / km
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cab.vendorCabCount} vendor vehicles, {cab.tripCount} trips
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => editCab(cab)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={working === `cab-delete-${cab.id}`}
                    onClick={() => deleteCab(cab)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!allCabs.length ? (
            <p className="rounded-xl border border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
              No cabs yet. Add cabs under categories to use model-specific pricing.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
    {actionModal.modal}
    </>
  )
}
