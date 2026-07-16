# Changelog

## 3.0.1 — Startup hotfix

### Corrected

- fixed a build-script replacement bug that corrupted one token inside bundled Three.js
- changed HTML injection to function-based replacements so `$&` remains literal JavaScript
- added syntax parsing for every generated inline script during validation
- added a visible startup watchdog for failures that occur before the main application can report them
- simplified and hardened the Windows launcher


## 3.0.0 — Foundation build

### Retained

- live solar-position engine
- rotatable textured Earth
- day/night blend and city lights
- astronomical, nautical, civil, and sunrise bands
- atmospheric halo
- cloud layer
- time acceleration and day scrubbing
- date selection
- click-to-inspect solar altitude

### Removed

- city dashboard
- hard-coded city database
- inaccurate season label
- remote runtime dependencies
- per-frame city-list rebuilding
- silent cloud failure

### Corrected

- cloud asset location
- cloud world-space lighting
- stale date and time controls
- clock-state drift
- missing-asset reporting

### Added

- ambient clock-first interface
- local and UTC time display
- modular layer switches
- slow-rotation switch
- fullscreen control
- keyboard controls
- local assets and bundled JavaScript
- rebuildable source package
- documentation and preserved originals
