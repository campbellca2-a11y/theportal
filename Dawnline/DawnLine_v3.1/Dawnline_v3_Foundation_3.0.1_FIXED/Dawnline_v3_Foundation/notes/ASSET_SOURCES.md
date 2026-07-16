# Asset and Dependency Sources

## JavaScript

- Three.js 0.160.0
- OrbitControls from the matching Three.js 0.160.0 package
- Bundled locally with esbuild 0.25.6

Three.js is distributed under the MIT License. A copy is included as `notes/THREE_LICENSE.txt`.

## Earth imagery

The local prototype assets were copied from the pinned npm package `three-globe@2.31.1`:

- `example/img/earth-blue-marble.jpg`
- `example/img/earth-night.jpg`
- `example/clouds/clouds.png`

All three are 4096 × 2048 pixels.

These files are included locally so Dawnline does not depend on a CDN or a third-party URL at runtime. Before distributing Dawnline publicly or commercially, verify the upstream imagery attribution and redistribution terms independently; the upstream package does not make every image's provenance obvious from the filenames alone.
