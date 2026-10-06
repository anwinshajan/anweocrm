@echo off
color 0A
title Anweo WhatsApp Omni-Bot
echo ===================================================
echo     STARTING ANWEO WHATSAPP OMNI-BOT
echo ===================================================
echo.
echo Launching the AI Brain and connecting to WhatsApp...
echo Please wait...
echo.

cd /d "%~dp0"
node scripts/whatsapp-worker.js

pause
