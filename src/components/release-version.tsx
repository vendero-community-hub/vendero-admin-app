"use client"

import { RELEASE } from '@/lib/release'

export function ReleaseVersion({ className }: { className?: string }) {
  const label = RELEASE.version === 'unknown' ? `Build ${RELEASE.buildId}` : `Version ${RELEASE.version}`
  const detail = [
    RELEASE.commitSha ? `Commit ${RELEASE.commitSha}` : 'Source revision unavailable',
    RELEASE.dirty ? 'Includes local changes' : null,
    `Build ${RELEASE.buildId}`,
  ].filter(Boolean).join(' · ')

  return (
    <small className={className} title={detail} style={{ fontSize: '11px', opacity: 0.7 }}>
      {label}{RELEASE.dirty ? ' · local' : ''}
    </small>
  )
}
