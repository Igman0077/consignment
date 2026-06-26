@echo off
setlocal
title Consignment Shop - Setup
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
echo.
pause
