@echo off
title Apex IDE
cd /d "%~dp0"
if exist "release\win-unpacked\Apex IDE.exe" (
  start "" "release\win-unpacked\Apex IDE.exe"
) else (
  npm start
)

