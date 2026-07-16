@echo off
setlocal
set "APP=%~dp0Dawnline_v3.html"
if not exist "%APP%" (
  echo Dawnline_v3.html is missing from this folder.
  echo Re-extract the complete ZIP and try again.
  pause
  exit /b 1
)
start "" "%APP%"
endlocal
