import { execFileSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const validSha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value) ? value.toLowerCase() : null

function validRelease(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (value.commitSha !== null && (typeof value.commitSha !== 'string' || validSha(value.commitSha) !== value.commitSha)) return false
  return value.version === (value.commitSha?.slice(0, 12) ?? 'unknown')
    && (value.dirty === null || typeof value.dirty === 'boolean')
    && typeof value.buildId === 'string' && /^[a-f0-9]{12}$/.test(value.buildId)
}

function ciRevision(env) {
  const key = env.RELEASE_COMMIT_SHA !== undefined ? 'RELEASE_COMMIT_SHA'
    : env.VERCEL === '1' && env.VERCEL_GIT_COMMIT_SHA !== undefined ? 'VERCEL_GIT_COMMIT_SHA' : null
  if (!key) return { key: null, sha: null }
  const sha = validSha(env[key])
  if (!sha) throw new Error(`[release] ${key} must be a full 40-character hexadecimal Git commit SHA. Correct it or remove it to use this app's own Git revision.`)
  return { key, sha }
}

// This module runs only while configuring a build or development server.
// Each independently deployed app carries its own copy; never borrow a parent repository.
export function captureRelease(projectRoot, env = process.env) {
  const root = realpathSync(projectRoot instanceof URL ? fileURLToPath(projectRoot) : projectRoot)
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
  }).trim()
  let localSha = null
  let dirty = null
  try {
    if (existsSync(path.join(root, '.git')) && realpathSync(git('rev-parse', '--show-toplevel')) === root) {
      localSha = validSha(git('rev-parse', 'HEAD'))
      dirty = git('status', '--porcelain', '--untracked-files=normal').length > 0
    }
  } catch {
    // Source archives and fresh repositories may have no usable Git metadata.
  }
  const { key: ciKey, sha: ciSha } = ciRevision(env)
  if (ciSha && localSha && ciSha !== localSha) {
    throw new Error(`[release] ${ciKey} does not match this app's Git HEAD. Check out the intended revision or correct/remove ${ciKey} before building.`)
  }
  const commitSha = ciSha ?? localSha
  return {
    version: commitSha?.slice(0, 12) ?? 'unknown',
    commitSha,
    dirty,
    buildId: randomUUID().replaceAll('-', '').slice(0, 12),
  }
}

export function withRelease(nextConfig, projectRoot) {
  let release
  return (phase) => {
    // A running production server must use the values already compiled into .next.
    if (phase === 'phase-production-server') return nextConfig
    if (!release) {
      const root = realpathSync(projectRoot instanceof URL ? fileURLToPath(projectRoot) : projectRoot)
      // Next reloads config in child build workers. Pass one snapshot to those workers
      // so browser chunks, server routes, and build output share the same identity.
      try {
        const inherited = JSON.parse(process.env.__VENDERO_BUILD_RELEASE_CAPTURE ?? 'null')
        if (inherited?.root === root && validRelease(inherited.release)) release = inherited.release
      } catch {
        // Ignore an invalid inherited capture and create this build's snapshot.
      }
      if (!release) {
        release = captureRelease(projectRoot)
        process.env.__VENDERO_BUILD_RELEASE_CAPTURE = JSON.stringify({ root, release })
        console.info(`[release] ${release.version}${release.dirty ? ' (local changes)' : ''} build ${release.buildId}`)
      }
    }
    return {
      ...nextConfig,
      env: { ...nextConfig.env, NEXT_PUBLIC_VENDERO_RELEASE: JSON.stringify(release) },
    }
  }
}
