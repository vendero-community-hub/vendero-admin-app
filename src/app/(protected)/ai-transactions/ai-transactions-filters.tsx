'use client'

import { CalendarDays, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AI_SERVICES, type AiFilters, type DatePreset } from './ai-transactions-data'
import { ErrorNotice } from './ai-transactions-shared'

const chip = 'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const selectClass = 'h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm'
const periods: Array<{ value: DatePreset; label: string }> = [{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }, { value: 'day', label: 'Choose date' }, { value: 'selected_month', label: 'Choose month' }, { value: 'range', label: 'Date range' }]

function FilterChip({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} className={`${chip} ${selected ? 'border-primary/35 bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`} onClick={onClick}>{children}</button>
}

export function AiTransactionFilters({ draft, filters, onDraft, onApply, onImmediate, onReset, models, error }: {
  draft: AiFilters; filters: AiFilters; onDraft: (patch: Partial<AiFilters>) => void; onApply: () => void; onImmediate: (patch: Partial<AiFilters>) => void; onReset: () => void; models: string[]; error: string | null
}) {
  const advancedCount = [filters.model, filters.status, filters.userId, filters.vendorProfileId, filters.search].filter(Boolean).length
  return <div aria-label="AI analytics filters" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date period">
        <CalendarDays className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {periods.map((period) => <FilterChip key={period.value} selected={draft.preset === period.value} onClick={() => onImmediate({ preset: period.value })}>{period.label}</FilterChip>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">AI service</span>
          <select className="h-9 min-w-[170px] appearance-none rounded-full border border-border bg-background pl-3 pr-9 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={filters.service} onChange={(event) => onImmediate({ service: event.target.value })}>
            <option value="">All services</option>
            {AI_SERVICES.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </label>
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onReset}><X className="h-3.5 w-3.5" />Reset</Button>
      </div>
    </div>
    {['day', 'selected_month', 'range'].includes(draft.preset) ? <div className="flex flex-wrap items-center gap-3 pl-0 sm:pl-7">
      {draft.preset === 'day' ? <label className="flex items-center gap-2 text-xs text-muted-foreground">Date<Input className="w-auto" type="date" value={draft.day} onChange={(event) => onImmediate({ day: event.target.value })} /></label> : null}
      {draft.preset === 'selected_month' ? <label className="flex items-center gap-2 text-xs text-muted-foreground">Month<Input className="w-auto" type="month" value={draft.month} onChange={(event) => onImmediate({ month: event.target.value })} /></label> : null}
      {draft.preset === 'range' ? <><label className="flex items-center gap-2 text-xs text-muted-foreground">Start date<Input className="w-auto" type="date" value={draft.startDay} onChange={(event) => onImmediate({ startDay: event.target.value })} /></label><label className="flex items-center gap-2 text-xs text-muted-foreground">End date<Input className="w-auto" type="date" value={draft.endDay} onChange={(event) => onImmediate({ endDay: event.target.value })} /></label><span className="text-xs text-muted-foreground">Both days included</span></> : null}
    </div> : null}
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"><SlidersHorizontal className="h-3.5 w-3.5" />More filters{advancedCount ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">{advancedCount}</span> : null}<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" /><span className="ml-auto text-[11px] font-normal text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone} · week starts Monday</span></summary>
      <form className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); onApply() }}>
        <label className="space-y-2 text-xs text-muted-foreground"><span>Model</span><Input list="ai-models" value={draft.model} onChange={(event) => onDraft({ model: event.target.value })} placeholder="All models" /></label>
        <label className="space-y-2 text-xs text-muted-foreground"><span>Status</span><select className={selectClass} value={draft.status} onChange={(event) => onDraft({ status: event.target.value })}><option value="">All statuses</option><option value="running">Running</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label>
        <label className="space-y-2 text-xs text-muted-foreground"><span>User ID</span><Input inputMode="numeric" value={draft.userId} onChange={(event) => onDraft({ userId: event.target.value })} placeholder="All users" /></label>
        <label className="space-y-2 text-xs text-muted-foreground"><span>Vendor profile ID</span><Input inputMode="numeric" value={draft.vendorProfileId} onChange={(event) => onDraft({ vendorProfileId: event.target.value })} placeholder="All vendors" /></label>
        <label className="space-y-2 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3"><span>Search transactions</span><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4" /><Input className="pl-9" value={draft.search} onChange={(event) => onDraft({ search: event.target.value })} placeholder="Transaction ID, operation, user name or email" /></div></label><Button type="submit">Apply more filters</Button>
        <datalist id="ai-models">{models.map((model) => <option key={model} value={model} />)}</datalist>
      </form>
    </details>
    {error ? <ErrorNotice message={error} /> : null}
  </div>
}
