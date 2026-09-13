# ThePortal

**Put it here. Get it there.**

Complete editable source plus a ready-to-run copy of the working phone/PC portal.

## Run it

1. Keep this folder together. Node.js 22.13 or newer must be installed on the PC; it is already installed on this PC.
2. Double-click **Start Portal.cmd**. The included runtime and built interface start without npm, a build, or internet access.
3. On the PC, click **Connect phone**. On the same home Wi-Fi, scan the QR code or use the displayed address and six-digit code.
4. Drop, choose, or paste a file on the PC. Choose photos/files or take a photo on the phone.
5. Open or download the item from the other device.

**Stop Portal.cmd** stops only the process launched from this folder. Finish active uploads first. Keep the PC awake while using the portal.

If ThePortal is already running on port 48831, Start opens that existing instance. It does not replace the running installation. To run this source copy, stop the existing instance using its own Stop launcher first. The current working app and its inbox have been left intact.

This clean source copy creates its own fresh inbox when first launched. Your original transferred files and pairing credentials are deliberately excluded.

## What is included

| File or folder | Purpose |
|---|---|
| app/page.tsx | Complete interactive interface and phone/file controls |
| app/globals.css | Layout, electric-yellow arrival cue, chasing corona |
| app/layout.tsx | ThePortal name, tagline, browser/home-screen metadata |
| server.mjs | Readable source for the local HTTP and file-transfer server |
| lib/tally.mjs | Persistent shared transfer counter and reset |
| lib/arrival-feedback.ts | Prevents duplicate or stale arrival cues |
| components, hooks, lib | Included UI components and helpers |
| ThePortal.runtime.mjs | Bundled server for running without npm dependencies |
| dist/client | Prebuilt browser interface |
| scripts/build-runtime.mjs | Recreates the bundled server from editable source |
| tests | Transfer-service and arrival-cursor regression checks |
| package.json, package-lock.json | Reproducible development dependency list |
| THIRD-PARTY-NOTICES.md | Third-party package notices |
| CONTROL.md | Current scope, evidence, and next checks |

The runtime is generated output. Make server edits in **server.mjs** and **lib**, then rebuild the runtime.

## Edit and rebuild

From this folder:

    npm ci
    npm run build:portable

That rebuilds both the browser interface and bundled server. Restart this folder's portal and refresh its browser tabs.

For source development:

    npm start
    npm run dev

Run these in separate terminals: the first starts the readable server source; the second opens the development interface at http://127.0.0.1:48832/. Stop any existing portal using port 48831 first. Production use only needs Start Portal.cmd.

Useful focused commands:

    npm run build
    npm run build:runtime
    npm run test:service
    npm run test:arrivals

## Everyday behavior

- Any file type can transfer, including pictures, documents, and voice memos.
- The other visible browser inbox refreshes roughly every 1.5 seconds.
- A completed arrival turns the hole electric yellow and runs a corona for five seconds.
- The shared counter counts each completed file once. Reset clears the counter on all devices without deleting files.
- Reduced-motion mode uses a still yellow cue and readable text.
- Copies remain in this folder's hidden **.portal-data** directory until removed.
- Limits: 100 MB per file, 1 GB total.
- The original files remain untouched. Formats are preserved as sent; HEIC previews depend on the receiving browser.
- Browser downloads on iPhone normally appear in Files/Downloads. For compatible photos, Open then the browser's Share/Save Image action may save to Photos.
- No automatic start at sign-in, Windows service, or cloud account is installed.

## Android

The current design uses ordinary browser file inputs and a separate camera input. The core workflow is expected to work in Chrome on Android, but has not been tested on an actual Android phone.

Test camera selection/cancel, Photos/Files/audio, PC-to-phone downloads, multiple files, and returning after screen lock. Check Samsung Internet separately before claiming broad Android support.

Direct **Share → ThePortal** from another app would be an optional enhancement. It would need an installed web app with a share target and an HTTPS plan; the current local-HTTP version does not include it.

Sources: [MDN file inputs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file), [Chrome Web Share Target](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target), [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

## Connection and data boundary

This version runs on the same trusted home network using local HTTP. Its transport is not encrypted. Pairing restricts access; it does not provide TLS. No public tunnel, port forwarding, firewall changes, VPN changes, or account service is configured by this package.

If the phone cannot connect, check PC sleep, same-network access, guest Wi-Fi isolation, and VPN local-network restrictions.

Do not distribute a used .portal-data folder: it contains the inbox and credentials. The provided archive contains neither.

## Verified evidence

The original working app passed its production build, TypeScript check, 35 service tests, and nine arrival-cursor tests. The user confirmed iPhone file/photo uploads across Edge/Safari and PC browsers, plus a Voice Memo transferred through Files and played in Windows Media Player.

Android device behavior and the exact camera-to-Photos round trip remain separate checks. Browser visual automation was not performed. See CONTROL.md for the package validation record.

The packaged runtime was independently verified without node_modules: all 44 checks passed. Its Start/Stop launchers also passed an isolated start, repeated-start, and stop check. The source and runtime can be copied together to another folder without an npm installation; Node.js remains required.
