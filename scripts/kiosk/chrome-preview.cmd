@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-kiosk.ps1" -Preview
if errorlevel 1 pause
