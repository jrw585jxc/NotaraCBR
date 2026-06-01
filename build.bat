@echo off
setlocal EnableDelayedExpansion
title NotaraCBR Builder

chcp 65001 >nul 2>&1
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
color 00
mode con: cols=58 lines=28

for /f %%a in ('powershell -NoProfile -Command "[char]27"') do set "ESC=%%a"

set "R=%ESC%[0m"
set "BOLD=%ESC%[1m"
set "AMBER=%ESC%[38;5;214m"
set "GOLD=%ESC%[38;5;179m"
set "GREEN=%ESC%[38;5;78m"
set "RED=%ESC%[38;5;203m"
set "CYAN=%ESC%[38;5;117m"
set "GRAY=%ESC%[38;5;242m"
set "WHITE=%ESC%[38;5;252m"

set "BAR0=........................"
set "BAR1=######.................."
set "BAR2=############............"
set "BAR3=##################......"
set "BAR4=########################"

set "STEP=0"

:: Run steps

set "STEP=1" & call :render
call npm install --silent 2>nul
if %errorlevel% neq 0 ( set "ERRMSG=npm install failed" & goto :fail )

set "STEP=2" & call :render
call npx vite build --logLevel silent 2>nul
if %errorlevel% neq 0 ( set "ERRMSG=Vite build failed" & goto :fail )

set "STEP=3" & call :render
call npx electron-packager . NotaraCBR --platform=win32 --arch=x64 --out=dist-electron --overwrite --ignore="^/src" --ignore="^/\.git" --ignore="^/dist-electron" --ignore="^/scripts" --electron-version=31.7.7 --icon=public/icon.ico --quiet 2>nul
if %errorlevel% neq 0 ( set "ERRMSG=Packaging failed" & goto :fail )

set "STEP=4" & call :render
call node scripts\create-installer.js 2>nul
if %errorlevel% neq 0 ( set "ERRMSG=Installer failed -- pause OneDrive and retry" & goto :fail )

set "STEP=5" & call :render
pause
exit /b 0

:: Fail

:fail
call :render
echo.
    echo    %RED%  x  !ERRMSG!%R%
echo.
if !STEP!==4 (
    echo    %GRAY%  Portable build still works:%R%
    echo    %CYAN%  dist-electron\NotaraCBR-win32-x64\%R%
    echo.
)
pause
exit /b 1

:: Render

:render
cls
echo.
echo.
echo    %AMBER%%BOLD%  NotaraCBR%R%  %GRAY%builder%R%
echo.

set /a _done=STEP-1
if !_done! lss 0 set _done=0
if !_done! gtr 4 set _done=4
set /a _pct=_done*25
call set "_bar=%%BAR!_done!%%"

if !_done!==4 (
    echo    %GREEN%[!_bar!]%R%  %WHITE%!_pct!%%%R%
) else (
    echo    %AMBER%[!_bar!]%R%  %WHITE%!_pct!%%%R%
)
echo.

call :step 1 "Installing dependencies"
call :step 2 "Building React frontend"
call :step 3 "Packaging Electron app "
call :step 4 "Creating installer     "

if !STEP!==5 (
    echo.
    echo    %GRAY%  . . . . . . . . . . . . . . . . . . .%R%
    echo.
    echo    %GREEN%%BOLD%  Build complete%R%
    echo.
    echo    %GRAY%  Installer%R%
    echo    %CYAN%  dist-electron\installer\NotaraCBR-Setup.exe%R%
    echo.
    echo    %GRAY%  Portable%R%
    echo    %CYAN%  dist-electron\NotaraCBR-win32-x64\%R%
    echo.
)
goto :eof

:step
set /a _n=%~1
if !STEP! gtr !_n! (
    echo    %GREEN%  done%R%  %GRAY%%~2%R%
) else if !STEP!==!_n! (
    echo    %AMBER%  wait%R%  %WHITE%%~2%R%
) else (
    echo    %GRAY%  ----  %~2%R%
)
goto :eof
