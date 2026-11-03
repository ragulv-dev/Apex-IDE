@echo off
title APEX
cd /d "%~dp0"
if exist "release\win-unpacked\APEX.exe" (
  start "" "release\win-unpacked\APEX.exe"
) else if exist "release\win-unpacked\Apex IDE.exe" (
  start "" "release\win-unpacked\Apex IDE.exe"
) else (
  npm start
)
