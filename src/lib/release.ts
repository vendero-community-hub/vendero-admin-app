export type Release = {
  version: string
  commitSha: string | null
  dirty: boolean | null
  buildId: string
}

// Next replaces this direct reference with a literal in both browser and server bundles.
// Never resolve Git or read runtime deployment variables here.
export const RELEASE: Readonly<Release> = Object.freeze(JSON.parse(
  process.env.NEXT_PUBLIC_VENDERO_RELEASE ??
  '{"version":"unknown","commitSha":null,"dirty":null,"buildId":"unknown"}'
))
