# ThePortal

**Put it here. Get it there.**

Drop a file on your PC, grab it on your phone later. Or the other way round.
No phone app, no cloud, no account. Scan a QR code once and you're paired.

- **Nothing to install on the phone.** It runs in the phone's browser.
- **The other side doesn't have to be there.** Files wait in the portal until you pick them up.
- **Stays in your house.** Files go over your home Wi-Fi and are kept on your PC, never uploaded anywhere.
- Photos, videos, documents, zips: any file type, up to 2 GB each, 10 GB in the portal at once.

## Get it (Windows)

Download the installer from the [latest release](https://github.com/campbellca2-a11y/theportal/releases/latest), run it, then open **ThePortal** from the Start menu.

1. Your browser opens ThePortal on the PC.
2. Click **Connect phone** and scan the QR code with your phone's camera. The phone must be on the same Wi-Fi.
3. Drop files into the circle on either device. They show up on the other one.

If Windows asks about network access, allow **Private networks**. If the phone can't connect, make sure your Wi-Fi is set to *Private* in Windows (Settings > Network & internet > Wi-Fi > your network).

Windows only for now. Any phone with a modern browser works as the other end (iPhone tested; Android expected to work).

## Good to know

- ThePortal uses plain HTTP on your local network. Pairing controls who can connect, but traffic isn't encrypted, so use it on your **home Wi-Fi**, not hotel or café networks.
- Keep the PC awake while transferring.
- Removing an item from the portal deletes only the portal's copy. Your original files are never touched.
- An upload is refused if it would leave less than 1 GB free on the PC's drive.
- On iPhone, downloads land in Files > Downloads. For photos, open the item and use Share > Save Image to put it in Photos.

## For developers

Requires Node.js 22.13 or newer.

    npm ci
    npm run build:portable   # browser UI (dist/) + bundled server (ThePortal.runtime.mjs)
    npm run start:portable   # run it at http://127.0.0.1:48831
    npm test                 # service, limits and arrival checks

Development mode: `npm start` (server from source) and `npm run dev` (UI at http://127.0.0.1:48832) in separate terminals.

| Path | What it is |
|---|---|
| `server.mjs` | Local HTTP + transfer server: pairing, uploads, limits |
| `app/page.tsx` | The whole interface: pairing door, portal, inbox |
| `app/globals.css` | Styling, including the portal ring and arrival corona |
| `lib/` | Transfer tally and arrival-cue logic |
| `scripts/build-runtime.mjs` | Bundles the server into one file |
| `tests/` | Service, limits and arrival-cue checks |

Limits can be overridden for testing with `PORTAL_MAX_FILE`, `PORTAL_MAX_TOTAL` and `PORTAL_MIN_FREE` (bytes). `PORTAL_DATA_DIR` and `PORTAL_PORT` set the inbox folder and port (default 48831).

Never commit or share a `.portal-data` folder. It holds the inbox and pairing credentials.

## License

MIT. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
