import { RELEASE } from '@/lib/release'

export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ release: RELEASE }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
