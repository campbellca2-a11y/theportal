$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$install = Join-Path $env:TEMP 'ThePortal Installer Test'
$data = Join-Path $env:LOCALAPPDATA 'ThePortal\Data'
if (Test-Path $data) { throw 'Smoke test requires a fresh Windows user with no Portal data' }
$setup = (Get-ChildItem (Join-Path $root 'release') -Filter 'ThePortalSetup-*-windows-x64.exe' | Select-Object -First 1).FullName
function Run([string]$file, [string]$arguments) {
    $p = Start-Process $file -ArgumentList $arguments -PassThru
    # Wait only for the launcher, not its intentionally long-lived server child.
    if (-not $p.WaitForExit(90000)) { $p.Kill(); throw "$file timed out" }
    if ($p.ExitCode -ne 0) { throw "$file failed with exit code $($p.ExitCode)" }
}
$base = 'http://127.0.0.1:48831'
try {
    Run $setup "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /DIR=`"$install`""
    if (-not (Test-Path "$install\runtime\node.exe")) { throw 'Bundled runtime missing' }
    Run "$install\ThePortal.exe" '--no-browser --quiet'
    $first = Get-Content "$data\process.txt"
    Run "$install\ThePortal.exe" '--no-browser --quiet'
    if (($first -join ',') -ne ((Get-Content "$data\process.txt") -join ',')) { throw 'Repeated launch started a second process' }
    Invoke-RestMethod "$base/api/connect" -Method Post -ContentType 'application/json' -Body '{"local":true}' -SessionVariable portal | Out-Null
    $item = Invoke-RestMethod "$base/api/items" -Method Post -WebSession $portal -ContentType 'text/plain' -Headers @{'X-File-Name'='acceptance.txt'} -Body 'preserve this file'
    $inboxFile = Join-Path $data "items\$($item.id).bin"
    if ((Get-Content $inboxFile -Raw) -ne 'preserve this file') { throw 'Upload bytes differ' }
    if (Test-Path "$install\.portal-data") { throw 'Data leaked into application directory' }
    Run "$install\ThePortal.exe" '--stop --quiet'
    Run "$install\ThePortal.exe" '--no-browser --quiet'
    $items = Invoke-RestMethod "$base/api/items" -WebSession $portal
    if ($items.items.id -notcontains $item.id) { throw 'Restart lost files or pairing' }
    # Reinstall over the running app exercises the upgrade stop path.
    Run $setup "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /DIR=`"$install`""
    Run "$install\ThePortal.exe" '--no-browser --quiet'
    $items = Invoke-RestMethod "$base/api/items" -WebSession $portal
    if ($items.items.id -notcontains $item.id) { throw 'Upgrade lost files' }
    Run "$install\unins000.exe" '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
    if (-not (Test-Path $inboxFile)) { throw 'Uninstall deleted inbox' }
    if (Test-Path "$install\ThePortal.exe") { throw 'Uninstall left the launcher' }
    'PASS: installer, bundled runtime, repeat launch, upload, restart, upgrade, uninstall, inbox preservation'
} finally {
    if (Test-Path "$install\ThePortal.exe") { & "$install\ThePortal.exe" --stop --quiet }
}
