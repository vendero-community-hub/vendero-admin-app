import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { captureRelease, withRelease } from './release.mjs'

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vendero-release-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

function repository(root) {
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
  git('init', '-q')
  writeFileSync(path.join(root, 'source.txt'), 'first revision')
  git('add', '.')
  git('-c', 'user.name=Release test', '-c', 'user.email=release@example.invalid', 'commit', '-qm', 'Initial revision')
  return git
}

test('captures own committed source and distinguishes changed local builds', (t) => {
  const root = fixture(t)
  const git = repository(root)
  const release = captureRelease(root, {})
  assert.equal(release.commitSha, git('rev-parse', 'HEAD'))
  assert.equal(release.version, release.commitSha.slice(0, 12))
  assert.equal(release.dirty, false)
  writeFileSync(path.join(root, 'source.txt'), 'local revision')
  const local = captureRelease(root, {})
  assert.equal(local.dirty, true)
  assert.equal(local.commitSha, release.commitSha)
  assert.notEqual(local.buildId, release.buildId)
})

test('untracked source is dirty and inherited parent Git metadata is not used', (t) => {
  const root = fixture(t)
  repository(root)
  const child = path.join(root, 'app')
  mkdirSync(child)
  writeFileSync(path.join(child, 'new-source.txt'), 'uncommitted source')
  assert.equal(captureRelease(root, {}).dirty, true)
  const release = captureRelease(child, {})
  assert.equal(release.version, 'unknown')
  assert.equal(release.commitSha, null)
  assert.equal(release.dirty, null)
  assert.match(release.buildId, /^[a-f0-9]{12}$/)
})

test('validates CI revision and requires Vercel context for its environment metadata', (t) => {
  const root = fixture(t)
  const sha = 'A'.repeat(40)
  assert.equal(captureRelease(root, { RELEASE_COMMIT_SHA: sha }).commitSha, sha.toLowerCase())
  assert.equal(captureRelease(root, { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: sha }).commitSha, sha.toLowerCase())
  assert.equal(captureRelease(root, { VERCEL_GIT_COMMIT_SHA: sha, GITHUB_SHA: sha }).commitSha, null)
})

test('rejects malformed explicit revisions instead of silently falling back', (t) => {
  const root = fixture(t)
  repository(root)
  for (const value of ['', 'invalid', 'a'.repeat(39), 'a'.repeat(41), 'g'.repeat(40)]) {
    assert.throws(() => captureRelease(root, { RELEASE_COMMIT_SHA: value }), /RELEASE_COMMIT_SHA must be a full 40-character hexadecimal Git commit SHA/)
    assert.throws(() => captureRelease(root, { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: value }), /VERCEL_GIT_COMMIT_SHA must be a full 40-character hexadecimal Git commit SHA/)
  }
})

test('rejects CI revisions for a different checkout and accepts matching revisions', (t) => {
  const root = fixture(t)
  const git = repository(root)
  const sha = git('rev-parse', 'HEAD')
  for (const env of [{ RELEASE_COMMIT_SHA: sha }, { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: sha }]) {
    const release = captureRelease(root, env)
    assert.equal(release.commitSha, sha)
    assert.equal(release.dirty, false)
  }
  assert.throws(() => captureRelease(root, { RELEASE_COMMIT_SHA: 'c'.repeat(40) }), /RELEASE_COMMIT_SHA does not match this app's Git HEAD/)
  assert.throws(() => captureRelease(root, { VERCEL: '1', VERCEL_GIT_COMMIT_SHA: 'c'.repeat(40) }), /VERCEL_GIT_COMMIT_SHA does not match this app's Git HEAD/)
})

test('Next injects captured literals for a build and does not recapture on production start', (t) => {
  const root = fixture(t)
  const config = { reactStrictMode: true, env: { EXISTING_SETTING: 'retained' } }
  const configure = withRelease(config, root)
  const built = configure('phase-production-build')
  const release = JSON.parse(built.env.NEXT_PUBLIC_VENDERO_RELEASE)
  assert.equal(built.env.EXISTING_SETTING, 'retained')
  assert.match(release.buildId, /^[a-f0-9]{12}$/)
  assert.deepEqual(configure('phase-production-build'), built)
  assert.equal(configure('phase-production-server'), config)
  assert.equal(config.env.NEXT_PUBLIC_VENDERO_RELEASE, undefined)
})

test('child build workers reuse the parent snapshot', (t) => {
  const root = fixture(t)
  const previous = process.env.__VENDERO_BUILD_RELEASE_CAPTURE
  t.after(() => {
    if (previous === undefined) delete process.env.__VENDERO_BUILD_RELEASE_CAPTURE
    else process.env.__VENDERO_BUILD_RELEASE_CAPTURE = previous
  })
  const parent = withRelease({}, root)('phase-production-build').env.NEXT_PUBLIC_VENDERO_RELEASE
  const source = `import { withRelease } from ${JSON.stringify(new URL('./release.mjs', import.meta.url).href)};
    console.log(withRelease({}, process.argv[1])('phase-production-build').env.NEXT_PUBLIC_VENDERO_RELEASE)`
  const worker = execFileSync(process.execPath, ['--input-type=module', '-e', source, root], { encoding: 'utf8' }).trim()
  assert.equal(worker, parent)
})

test('discards same-root inherited snapshots with malformed release fields', (t) => {
  const root = realpathSync(fixture(t))
  const previous = process.env.__VENDERO_BUILD_RELEASE_CAPTURE
  t.after(() => {
    if (previous === undefined) delete process.env.__VENDERO_BUILD_RELEASE_CAPTURE
    else process.env.__VENDERO_BUILD_RELEASE_CAPTURE = previous
  })
  const valid = { version: 'aaaaaaaaaaaa', commitSha: 'a'.repeat(40), dirty: false, buildId: 'b'.repeat(12) }
  process.env.__VENDERO_BUILD_RELEASE_CAPTURE = JSON.stringify({ root, release: valid })
  assert.deepEqual(JSON.parse(withRelease({}, root)('phase-production-build').env.NEXT_PUBLIC_VENDERO_RELEASE), valid)
  for (const release of [
    null, {}, [], 'invalid',
    { ...valid, version: 'not-the-commit' },
    { ...valid, commitSha: 'invalid' },
    { ...valid, dirty: 'false' },
    { ...valid, buildId: null },
    { ...valid, buildId: 'invalid' },
    { ...valid, commitSha: null },
  ]) {
    process.env.__VENDERO_BUILD_RELEASE_CAPTURE = JSON.stringify({ root, release })
    const actual = JSON.parse(withRelease({}, root)('phase-production-build').env.NEXT_PUBLIC_VENDERO_RELEASE)
    assert.equal(actual.version, 'unknown')
    assert.equal(actual.commitSha, null)
    assert.equal(actual.dirty, null)
    assert.match(actual.buildId, /^[a-f0-9]{12}$/)
    assert.notEqual(actual.buildId, valid.buildId)
  }
})
