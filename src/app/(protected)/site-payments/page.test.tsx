// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SitePaymentsPage from './page'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('website payment activation', () => {
  it('reads requests without verifying credentials and only activates on explicit submit', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ data: { items: [{ vendor_profile_id: 42, business_name: 'Cab Company', status: 'requested', notes: 'Please set up payments.' }] } }) }))
    vi.stubGlobal('fetch', fetcher)
    render(<SitePaymentsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Cab Company/ }))
    expect(fetcher).toHaveBeenCalledTimes(1)
    await userEvent.type(screen.getByLabelText('Razorpay key ID'), 'rzp_test_key')
    await userEvent.type(screen.getByLabelText('Razorpay key secret'), 'key-secret-value')
    await userEvent.type(screen.getByLabelText('Webhook signing secret'), 'webhook-secret-value')
    expect(fetcher).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Verify and activate' }))
    await screen.findByText(/Payment credentials verified and activated/)
    const call = (fetcher.mock.calls as unknown as [string, RequestInit][]).find(([path]) => path.endsWith('/activate'))
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ vendorProfileId: 42, keyId: 'rzp_test_key', keySecret: 'key-secret-value', webhookSecret: 'webhook-secret-value', testMode: true })
    expect((screen.getByLabelText('Razorpay key secret') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Webhook signing secret') as HTMLInputElement).value).toBe('')
  })
})
