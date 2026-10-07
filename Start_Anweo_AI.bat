@echo off
color 0A
title Anweo WhatsApp Omni-Bot
echo ===================================================
echo     STARTING ANWEO CRM ^& WHATSAPP OMNI-BOT
echo ===================================================
echo.
echo Launching the Local CRM Server...
cd /d "C:\Users\ANWIN\Desktop\ANWEO\CRM\anweocrm"
start "Anweo CRM Server" cmd /k "npm run dev"

echo.
echo Launching the AI Brain and connecting to WhatsApp...
echo Please wait...
echo.

node scripts/whatsapp-worker.js

pause
