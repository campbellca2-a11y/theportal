@echo off
REM ============================================================
REM  SCREENRIG II launcher
REM
REM  Serves this folder and opens the control panel. The panel
REM  enumerates your monitors and spawns one window per screen.
REM
REM  WHY NOT LAUNCH THE THREE WINDOWS FROM HERE:
REM  Chrome only honors --window-position on a fresh browser
REM  instance, which needs a separate --user-data-dir, which puts
REM  each window in its own storage partition -- and
REM  BroadcastChannel does not cross partitions. Three windows,
REM  three isolated worlds, no sync. The in-page launcher keeps
REM  every window in ONE profile, which is what makes the bus work.
REM ============================================================

set PORT=8765
cd /d "%~dp0"

echo Starting local server on port %PORT% ...
start "screenrig-server" /min cmd /c "python -m http.server %PORT%"
REM  No Python on the Windows side? Use this instead:
REM  start "screenrig-server" /min cmd /c "npx --yes serve -l %PORT% ."

timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/screenrig2.html"

echo.
echo Control panel opened.
echo   1. Click DETECT SCREENS ^& LAUNCH  (Chrome will ask for Window Management permission)
echo   2. Click into each window and press F for fullscreen
echo.
echo   Arrow keys drive from ANY window.  R reset.  0 demo.  H hud.
echo   If detection is blocked, use the manual option and drag the windows yourself.
echo.
echo Close this window to kill the server.
pause
