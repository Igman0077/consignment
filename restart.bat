@echo off
setlocal
title Consignment Shop - Restart
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1"
pause
