@echo off
title NotaraCBR Build
echo.
echo  ================================
echo   NotaraCBR - Build Script
echo  ================================
echo.

:: Check Node is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [1/2] Building React frontend...
call npx vite build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Packaging Electron app...
call npx electron-packager . NotaraCBR --platform=win32 --arch=x64 --out=dist-electron --overwrite --ignore="^/src" --ignore="^/\.git" --ignore="^/dist-electron" --electron-version=31.7.7 --icon=public/icon.ico
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   Build complete!
echo   dist-electron\NotaraCBR-win32-x64\NotaraCBR.exe
echo  ================================================
echo.
pause
