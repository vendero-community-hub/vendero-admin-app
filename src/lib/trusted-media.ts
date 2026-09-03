'use client'

import { uploadTrustedMedia, type TrustedMediaProgress } from '@vendero/media/client'
import type { MediaPurpose } from '@vendero/media'

function clientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function uploadAdminMedia(
  file: File,
  purpose: MediaPurpose,
  options: { signal?: AbortSignal; onProgress?: (progress: TrustedMediaProgress) => void } = {}
) {
  const [asset] = await uploadTrustedMedia({
    purpose,
    files: [{ clientId: clientId(), name: file.name, type: file.type, size: file.size, body: file }],
    apiBasePath: '/api/v1/admin/media',
    apiRequest: (path, init) => fetch(path, { ...init, credentials: 'include', cache: 'no-store' }),
    signal: options.signal,
    onProgress: options.onProgress,
  })
  if (!asset) throw new Error('The media service did not return an asset.')
  return asset
}
