@echo off
setlocal
title Consignment Shop
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1"
pause
