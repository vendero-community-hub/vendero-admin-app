// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SiteProjectsPage from './page'
vi.mock('socket.io-client', () => ({ io: () => ({ on: vi.fn(), disconnect: vi.fn() }) }))
vi.mock('@/lib/trusted-media', () => ({ uploadAdminMedia: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('admin custom projects', () => {
  it('locks accepted quotes and updates milestone status only from its save control', async () => {
    const project = { publicId: 'project-1', vendorProfileId: 42, title: 'Cab site', brief: 'Custom website', status: 'in_progress', referenceUrls: [], deadlineAt: null, deliveryUrl: null }
    const detail = { project, quote: { publicId: 'quote-1', totalAmount: 5000, currency: 'INR', scope: 'Build a website.', status: 'accepted' }, milestones: [{ publicId: 'milestone-1', title: 'Design', amount: 5000, dueAt: '2026-09-01T00:00:00Z', deadlineAt: null, status: 'pending', paymentStatus: 'paid' }], messages: { items: [], nextBefore: null } }
    const fetcher = vi.fn(async (path: string, init?: RequestInit) => ({ ok: true, json: async () => ({ data: path.endsWith('/projects') ? { items: [project], nextBefore: null } : detail }) }))
    vi.stubGlobal('fetch', fetcher)
    render(<SiteProjectsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Cab site/ }))
    await screen.findByText('Accepted scope and amounts are locked.')
    expect(screen.queryByRole('button', { name: 'Revise offered quote' })).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText('Status for Design'), 'completed')
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Update milestone' }))
    expect(fetcher).toHaveBeenCalledWith('/api/v1/admin/sites/projects/project-1/milestones/milestone-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'completed', deadlineAt: null }) }))
  })
})
