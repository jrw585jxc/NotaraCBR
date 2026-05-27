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

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/3] Building React frontend...
call npx vite build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Packaging + creating installer...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo [ERROR] electron-builder failed.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   Build complete!
echo.
echo   Installer:  dist-electron\NotaraCBR Setup.exe
echo   Portable:   dist-electron\NotaraCBR.exe
echo  ================================================
echo.
pause
