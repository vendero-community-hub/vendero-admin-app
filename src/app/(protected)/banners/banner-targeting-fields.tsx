'use client'

import * as React from 'react'
import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BannerSubscriptionPlanOption = {
  id: number
  code: string
  name: string
  billingInterval?: string | null
  currency?: string | null
  priceAmount?: number | null
}

export type BannerCityOption = {
  id: number
  city: string
  state?: string | null
  label: string
}

type BannerTargetingFieldsProps = {
  subscriptionPlans: BannerSubscriptionPlanOption[]
  initialCities: BannerCityOption[]
  locationsEndpoint: string
  appEnv: string
  defaultAudience?: string
  defaultSubscriptionPlanIds?: number[]
  defaultCityMode?: string
  defaultSelectedCities?: BannerCityOption[]
}

function normalizeCityRows(payload: any): BannerCityOption[] {
  const rows = payload?.data ?? payload?.results ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows
    .map((row): BannerCityOption | null => {
      const id = Number(row?.id ?? row?.placeId ?? 0)
      const city = String(row?.city ?? row?.name ?? row?.cityName ?? '').trim()
      const state = String(row?.state ?? row?.stateName ?? '').trim()
      const label = String(row?.label ?? row?.formattedAddress ?? [city, state].filter(Boolean).join(', ')).trim()

      if (!id || !city) return null
      return { id, city, state, label: label || city }
    })
    .filter((row): row is BannerCityOption => Boolean(row))
}

function citySearchValue(city: BannerCityOption) {
  return `${city.city} ${city.state ?? ''} ${city.label}`.toLowerCase()
}

export function BannerTargetingFields({
  subscriptionPlans,
  initialCities,
  locationsEndpoint,
  appEnv,
  defaultAudience = 'all',
  defaultSubscriptionPlanIds = [],
  defaultCityMode = 'all',
  defaultSelectedCities = [],
}: BannerTargetingFieldsProps) {
  const [audience, setAudience] = React.useState(defaultAudience === 'subscriptions' ? 'subscriptions' : 'all')
  const [cityMode, setCityMode] = React.useState(defaultCityMode === 'selected' ? 'selected' : 'all')
  const [selectedPlanIds, setSelectedPlanIds] = React.useState(() => new Set(defaultSubscriptionPlanIds))
  const [selectedCities, setSelectedCities] = React.useState<BannerCityOption[]>(defaultSelectedCities)
  const [cityQuery, setCityQuery] = React.useState('')
  const [cityRows, setCityRows] = React.useState(initialCities)
  const [loadingCities, setLoadingCities] = React.useState(false)

  React.useEffect(() => {
    const query = cityQuery.trim()
    if (query.length < 2) {
      setCityRows(initialCities)
      return undefined
    }

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoadingCities(true)
        const url = new URL(locationsEndpoint)
        url.searchParams.set('q', query)
        url.searchParams.set('type', 'city')
        url.searchParams.set('includeAirports', 'false')

        const response = await fetch(url.toString(), {
          signal: abortController.signal,
          headers: { 'x-vendero-env': appEnv },
        })
        const payload = await response.json().catch(() => ({}))
        if (!abortController.signal.aborted) {
          setCityRows(normalizeCityRows(payload))
        }
      } catch {
        if (!abortController.signal.aborted) setCityRows([])
      } finally {
        if (!abortController.signal.aborted) setLoadingCities(false)
      }
    }, 260)

    return () => {
      abortController.abort()
      window.clearTimeout(timeoutId)
    }
  }, [appEnv, cityQuery, initialCities, locationsEndpoint])

  const selectedPlans = React.useMemo(
    () => subscriptionPlans.filter((plan) => selectedPlanIds.has(plan.id)),
    [selectedPlanIds, subscriptionPlans]
  )

  const visibleCities = React.useMemo(() => {
    const query = cityQuery.trim().toLowerCase()
    const rows = query.length < 2
      ? cityRows.filter((city) => !query || citySearchValue(city).includes(query))
      : cityRows
    return rows.slice(0, 30)
  }, [cityQuery, cityRows])

  const togglePlan = (id: number) => {
    setSelectedPlanIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCity = (city: BannerCityOption) => {
    setSelectedCities((current) => {
      if (current.some((item) => item.id === city.id)) {
        return current.filter((item) => item.id !== city.id)
      }
      return [...current, city]
    })
  }

  return (
    <div className="space-y-4 sm:col-span-2">
      <input type="hidden" name="targetAudience" value={audience} />
      <input type="hidden" name="cityMode" value={cityMode} />
      {audience === 'subscriptions' ? (
        <>
          {selectedPlans.map((plan) => (
            <React.Fragment key={`plan-${plan.id}`}>
              <input type="hidden" name="subscriptionPlanIds" value={plan.id} />
              <input type="hidden" name="subscriptionPlanCodes" value={plan.code} />
            </React.Fragment>
          ))}
        </>
      ) : null}
      {cityMode === 'selected' ? (
        <>
          {selectedCities.map((city) => (
            <React.Fragment key={`city-${city.id}`}>
              <input type="hidden" name="cityIds" value={city.id} />
              <input type="hidden" name="targetCities" value={city.city} />
            </React.Fragment>
          ))}
        </>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Target audience</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All members' },
            { value: 'subscriptions', label: 'Only subscription users' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAudience(option.value)}
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-semibold transition',
                audience === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background/50 text-muted-foreground hover:bg-background'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {audience === 'subscriptions' ? (
        <div className="rounded-xl border border-border/70 bg-background/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Subscription plans</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {subscriptionPlans.length ? (
              subscriptionPlans.map((plan) => {
                const selected = selectedPlanIds.has(plan.id)
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    className={cn(
                      'flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/70 bg-background/40 text-muted-foreground hover:bg-background'
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{plan.name}</span>
                      <span className="block text-xs">{plan.code}</span>
                    </span>
                    {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                )
              })
            ) : (
              <p className="rounded-lg border border-dashed border-border/80 p-3 text-sm text-muted-foreground">
                No subscription plans found.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">City target</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All cities' },
            { value: 'selected', label: 'Choose cities' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCityMode(option.value)}
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-semibold transition',
                cityMode === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background/50 text-muted-foreground hover:bg-background'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {cityMode === 'selected' ? (
        <div className="rounded-xl border border-border/70 bg-background/25 p-3">
          <div className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-background/70 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Search city"
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {selectedCities.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCities.map((city) => (
                <button
                  key={`selected-${city.id}`}
                  type="button"
                  onClick={() => toggleCity(city)}
                  className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  {city.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
            {loadingCities ? (
              <p className="rounded-lg border border-dashed border-border/80 p-3 text-sm text-muted-foreground">Loading cities...</p>
            ) : visibleCities.length ? (
              visibleCities.map((city) => {
                const selected = selectedCities.some((item) => item.id === city.id)
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/70 bg-background/40 text-muted-foreground hover:bg-background'
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{city.city}</span>
                      <span className="block text-xs">{city.state || city.label}</span>
                    </span>
                    {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                )
              })
            ) : (
              <p className="rounded-lg border border-dashed border-border/80 p-3 text-sm text-muted-foreground">
                Search another city name.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
