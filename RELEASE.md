# Running version

The footer or account menu shows the version compiled into the loaded website. Hover over it for the full commit and build identifier. `/api/version` is a public, uncached endpoint with the running server artifact's `{ release: { version, commitSha, dirty, buildId } }`. A browser kept open during a deployment can show an older version than this endpoint; reload to load the new website.

Every `next build` (including `npm run build` and Vercel) captures the full commit and prints `[release] <version> build <buildId>`. `version` is the first 12 characters of the commit. Vercel supplies its Git revision automatically. Other source archives can provide a full 40-character `RELEASE_COMMIT_SHA` at build time. A supplied revision must be a full hexadecimal commit SHA and must match this app's Git HEAD when available; invalid or mismatched metadata stops the build with a correction message. Otherwise, only this app's own Git root is used. A folder without its own Git metadata reports `unknown` and still receives a unique build identifier.

Local changes set `dirty: true` and add “local” beside the version. `dirty: null` means Git could not certify the working tree. The build identifier distinguishes builds from the same revision, including builds with local changes. Runtime environment changes and later commits do not change an existing built artifact's release. Restart the development server after source revision changes; production changes require a new build.

Run `npm run test:release` to check revision selection, local changes, source archives, and build/start behavior.
