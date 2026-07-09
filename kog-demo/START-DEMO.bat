@echo off
title KOG Demo
rem Start de KOG-demo: opent vanzelf je browser. Sluit dit venster om te stoppen.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
pause
