#define AppVersion "0.1.1"
[Setup]
AppId={{6A5EB748-2B34-4201-B81B-40C760CA413C}
AppName=ThePortal
AppVersion={#AppVersion}
AppPublisher=Bill Campbell
DefaultDirName={localappdata}\Programs\ThePortal
DefaultGroupName=ThePortal
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=..\..\release
OutputBaseFilename=ThePortalSetup-{#AppVersion}-windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\ThePortal.exe
SetupIconFile=portal.ico
InfoAfterFile=First-run.txt
CloseApplications=yes
RestartApplications=no

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: checkedonce

[Files]
Source: "..\..\build\windows\ThePortal.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\build\windows\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "..\..\ThePortal.runtime.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\ThePortal.runtime.mjs.LEGAL.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\THIRD-PARTY-NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\dist\client\*"; DestDir: "{app}\dist\client"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "First-run.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ThePortal"; Filename: "{app}\ThePortal.exe"
Name: "{group}\Stop ThePortal"; Filename: "{app}\ThePortal.exe"; Parameters: "--stop"
Name: "{group}\Help"; Filename: "{app}\First-run.txt"
Name: "{autodesktop}\ThePortal"; Filename: "{app}\ThePortal.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\ThePortal.exe"; Description: "Open ThePortal"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\ThePortal.exe"; Parameters: "--stop --quiet"; Flags: runhidden waituntilterminated

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var ExitCode: Integer;
begin
  Result := '';
  if FileExists(ExpandConstant('{app}\ThePortal.exe')) then
    if not Exec(ExpandConstant('{app}\ThePortal.exe'), '--stop --quiet', '', SW_HIDE, ewWaitUntilTerminated, ExitCode) then
      Result := 'Close ThePortal before continuing.'
    else if ExitCode <> 0 then
      Result := 'ThePortal could not stop. Close it before continuing.';
end;
