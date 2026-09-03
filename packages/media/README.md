# Vendored media package

This directory is the deployable build of `@vendero/media` used by the
standalone admin application. It must remain inside this repository because
Vercel checks out this repository without the surrounding VenderO workspace.

When the shared media contract changes, rebuild the workspace package and sync
its `dist` files here before deploying the admin application.
