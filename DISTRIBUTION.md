# ThePortal distribution review

Decision: a normal Windows installer, followed by a shortcut. The public website distributes the app; every household runs its own local Portal.

## The complete user journey

1. Open the public ThePortal download page.
2. Download the versioned Windows x64 installer from a GitHub Release.
3. Install for the current Windows user. No separate Node.js installation is needed.
4. Open ThePortal from its shortcut. It opens http://127.0.0.1:48831 on that PC.
5. On the same trusted home network, pair the phone using the PC's QR code.
6. Transfer files. Use Stop ThePortal from the Start menu after transfers finish.

The phone needs only its browser. Distribution over the internet does not require transferring users' files over the internet.

## Responsibilities and data boundaries

| Component | Responsibility |
| --- | --- |
| Static website in distribution/ | Explain, demonstrate the arrival cue, and link to the released installer |
| GitHub Releases | Versioned installer download, checksum, release notes |
| Installed Windows app | Bundled Node runtime, local server, PC and phone interface |
| User profile: LocalAppData/ThePortal/Data | Inbox, pairing credentials, transfer tally, process identity |

No account, cloud relay, public tunnel, port forwarding, scheduled startup, or telemetry is added. The existing server and transfer UI are unchanged. Original files are not migrated or modified. Uninstall preserves the inbox. Existing standalone installations retain their own inboxes and must be stopped before opening this installed version on port 48831.

The current protocol is HTTP on a trusted LAN. Pairing is access control, not encryption. Limits are 2 GB per file and 10 GB per inbox, with a 1 GB free-disk floor. Transfers between different homes are outside this version. Android hardware support still needs validation.

## What changed

- Inno Setup installs into the current user's Programs folder without requesting elevation.
- A small native Windows launcher uses only the included Node runtime. It opens the local browser after readiness, detects repeated launches, and stops only a saved PID with matching creation time and executable path.
- The runtime receives an explicit user-profile data directory. No inbox is written beneath the installed application.
- Packaging uses an explicit file allowlist. Source checkouts, local inboxes, credentials, node_modules, logs, and development outputs are not installer payloads.
- Node 22.23.2 x64 is pinned and the downloaded archive is checked against its published SHA-256. Node's license and package notices are included.
- No blanket firewall exception is created. Windows may ask for Private-network access; managed PCs may need administrator help.
- The existing root Vercel configuration is preserved. The distribution folder has its own static configuration for a separate review deployment. Deploying the repository root still serves the old interface and is not the intended download site.

## Build and review

The Windows installer review GitHub Actions workflow builds the interface and bundled server, runs existing service and arrival tests, compiles the launcher and installer, and runs an installer smoke test. It uploads an installer and SHA-256 file as a review artifact only after these steps pass. It does not publish a release.

The smoke test requires an isolated Windows user with no pre-existing Portal data. It covers install into a path containing spaces, included runtime, repeat launch, upload, restart, reinstall over a running app, uninstall, and inbox preservation. The existing service suite checks LAN pairing and byte-identical transfers using clients on the runner. Neither substitutes for physical phone testing or a non-administrator Windows user.

A local Windows build requires the package's Node development prerequisite, npm dependencies, and Inno Setup 6.4 or later. Build the portable app first, then run packaging/windows/Build.ps1. The downloadable installer itself has no separate Node dependency. The icon is stored as base64 source and decoded by the build script.

## Public release handoff

1. Review the draft PR and successful Windows artifact. Test under a standard Windows account: open the shortcut, pair a real phone, transfer in both directions, stop/reopen, and uninstall with an inbox item retained. Also verify the Windows Firewall prompt on a clean PC.
2. Decide on code signing. This review installer is unsigned; a checksum detects download changes but does not establish publisher reputation. Do not instruct users to disable Windows security. Signing is a separate release concern, not a reason to change local-first transfer architecture.
3. Publish the exact tested installer and its checksum as assets of a versioned GitHub Release. Do not substitute GitHub's automatic source-code ZIP for the installer. Publish release notes with the Windows architecture, known limits, and unsigned/signed status.
4. Replace the disabled preview download control with a link to that verified installer asset. Keep release status and platform copy accurate. Do not invent a download URL before the asset exists.
5. Deploy distribution/ as the static public website, using its own configuration. Keep the local app's browser interface inside the installer. The public page must never display pairing inputs or call local transfer APIs.
6. Share the website link. Downloading and running the app creates each user's own Portal; your PC does not need to stay online for anyone else.

## Validation at initial review

- Linux: app and bundled runtime build passed; 9/9 arrival checks passed.
- Linux service suite: blocked before startup by restricted network-interface enumeration in the test environment.
- Windows: see the linked GitHub Actions run for authoritative build and installation results.
- Physical phone, standard-user Windows, code signing, and public release: pending.
