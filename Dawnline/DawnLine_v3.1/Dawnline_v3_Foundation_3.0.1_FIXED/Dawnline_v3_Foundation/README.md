# Dawnline III — Foundation Build 3.0.1

Dawnline is a live world clock made from sunlight. It shows the current boundary between night, astronomical twilight, nautical twilight, civil twilight, sunrise, and day on a rotatable Earth.

Version 3.0.1 is the corrected foundation build. It preserves the useful astronomy and globe mechanism from the earlier prototypes while removing the city dashboard, fake season labels, remote CDN dependencies, and silent asset failures.

## Start it

1. Extract the complete ZIP and keep the entire `Dawnline_v3_Foundation` folder together.
2. Double-click `START_DAWNLINE.bat`.
3. You can also open `Dawnline_v3.html` directly in Chrome, Edge, or Firefox.

No installation and no internet connection are required. The `assets` folder must remain beside `Dawnline_v3.html`. If startup fails, Dawnline now reports the failure on screen instead of remaining indefinitely on the loading card.

## Basic use

- Drag Earth to rotate it.
- Use the mouse wheel to zoom.
- Click anywhere on Earth to inspect that location's coordinates, solar altitude, and light phase.
- Open **Controls** to pause, accelerate, scrub through a day, change the date, or switch visual layers.
- Select **Return to now** to restore the live clock.
- Select **Fullscreen** for an ambient display.

Keyboard controls:

- `Space` — pause or resume the simulation
- `N` — return to the current time
- `C` — open or close controls
- `Esc` — close controls and inspection readouts

## What changed from v2

- Removed the city dashboard and city database.
- Removed the inaccurate season label.
- Bundled Three.js and OrbitControls into the HTML.
- Stored all Earth and cloud textures locally.
- Corrected the broken cloud-image path.
- Corrected cloud lighting so the light moves with the rotating cloud sphere.
- Replaced multiple drifting time states with one clock state.
- Kept the date, clock, slider, globe, and readouts synchronized.
- Reduced DOM updates instead of rebuilding a panel every animation frame.
- Added visible fallback behavior for missing assets.
- Added independent switches for stars, night lights, twilight, clouds, atmosphere, and slow rotation.
- Preserved click inspection and time simulation as foundation capabilities.

## Folder map

```text
Dawnline_v3/
├── Dawnline_v3.html          Double-clickable application
├── START_DAWNLINE.bat        Windows launcher
├── assets/                   Local Earth and cloud textures
├── originals/                Untouched v1 and v2 prototype files
├── src/                      Readable v3 source code and HTML template
├── scripts/                  Rebuild and validation scripts
├── dist/                     Bundled JavaScript used to build the HTML
├── notes/                    Math, assets, changes, and limitations
├── package.json              Reproducible build definition
└── README.md
```

## Rebuild it

Rebuilding is optional. Running Dawnline does not require Node.js.

To rebuild after editing `src/main.js`, `src/index.html`, or `styles.css`:

```powershell
npm install
npm run build
npm run validate
```

The build process copies the pinned local assets, bundles Three.js, and generates the finished `Dawnline_v3.html`.

## Design boundary

This version is intentionally a foundation, not a feature catalog. The default experience is:

- Earth
- current time
- day and night
- the dawnline
- optional visual layers

Cities, weather, sound, labels, geographic stories, and additional data can be added later as separate modules rather than welded into the clock.

## 3.0.1 startup correction

The first 3.0.0 handoff contained a build-script defect: JavaScript replacement-string syntax altered one token inside the bundled Three.js code, causing an immediate browser parse failure. Version 3.0.1 changes the builder to function-based replacements, validates every inline script before packaging, and includes a visible startup watchdog.
