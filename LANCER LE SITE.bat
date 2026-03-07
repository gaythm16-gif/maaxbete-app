@echo off
title Maaxbete - Serveur de dev
cd /d "%~dp0"
echo.
echo ========================================
echo   DEMARRAGE DU SITE MAAXBETE
echo ========================================
echo.
echo Le site sera accessible sur:  http://localhost:5173
echo.
echo Ouvrez votre navigateur (Chrome, Edge, Firefox)
echo et allez a:  http://localhost:5173
echo.
echo Pour arreter le site: fermez cette fenetre
echo ========================================
echo.
call npm.cmd run dev
if errorlevel 1 (
  echo.
  echo ERREUR au demarrage.
  echo Essayez: Clic droit sur ce fichier ^> Executer en tant qu'administrateur
  echo.
)
pause
