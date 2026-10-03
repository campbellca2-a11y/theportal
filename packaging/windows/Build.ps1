$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
$version = '22.23.2'
$expected = '1177b4137ba5adaa56354ae40f1080c7450e8ae09cecb47da459d1c52ac99f97'
[IO.File]::WriteAllBytes("$PSScriptRoot\portal.ico", [Convert]::FromBase64String((Get-Content "$PSScriptRoot\portal.ico.base64" -Raw)))
$build = Join-Path $root 'build\windows'
New-Item "$build\runtime" -ItemType Directory -Force | Out-Null
$zip = Join-Path $build 'node.zip'
Invoke-WebRequest "https://nodejs.org/dist/v$version/node-v$version-win-x64.zip" -OutFile $zip
if ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Node archive checksum mismatch' }
Expand-Archive $zip -DestinationPath "$build\node" -Force
Copy-Item "$build\node\node-v$version-win-x64\node.exe" "$build\runtime\node.exe" -Force
Copy-Item "$build\node\node-v$version-win-x64\LICENSE" "$build\runtime\LICENSE" -Force
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
& $csc /nologo /target:winexe /reference:System.Windows.Forms.dll "/win32icon:$PSScriptRoot\portal.ico" "/out:$build\ThePortal.exe" "$PSScriptRoot\Launcher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Launcher compilation failed' }
$compiler = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $compiler)) { $compiler = "${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe" }
if (-not (Test-Path $compiler)) { throw 'Install Inno Setup 6.4+ before building' }
& $compiler "$PSScriptRoot\ThePortal.iss"
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed' }
$installer = (Get-ChildItem (Join-Path $root 'release') -Filter 'ThePortalSetup-*-windows-x64.exe' | Select-Object -First 1).FullName
$hash = (Get-FileHash $installer -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([IO.Path]::GetFileName($installer))" | Set-Content "$installer.sha256" -Encoding ascii
