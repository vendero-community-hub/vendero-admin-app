import { AiTransactionDetailPanel } from '../ai-transaction-detail-panel'

export default async function AiTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // App Router's getDynamicParam encodes the value passed to this page.
  // Decode that one route layer; the panel owns API encoding and raw-ID events.
  const transactionId = decodeURIComponent(id)
  return <main className="mx-auto w-full max-w-7xl space-y-6"><AiTransactionDetailPanel transactionId={transactionId} /></main>
}
