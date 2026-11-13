@echo off
REM Double-cliquez sur ce fichier (Windows) pour lancer le configurateur en local.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n'est pas installe : https://nodejs.org & pause & exit /b 1)
if not exist node_modules (echo Installation des composants... & call npm install)
start "" cmd /c "timeout /t 25 >nul & start http://localhost:3000/fr"
call npm run local
pause
