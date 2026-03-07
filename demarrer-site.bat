@echo off
title Maaxbete - Serveur de dev
cd /d "%~dp0"
echo.
echo Demarrage du site sur http://localhost:5173
echo Ouvrez votre navigateur: http://localhost:5173
echo Pour arreter: fermez cette fenetre ou Ctrl+C
echo.
call npm.cmd run dev
if errorlevel 1 (
  echo.
  echo --- Si erreur EPERM / "Connection Failed" ---
  echo 1. Clic droit sur "demarrer-site.bat" ^> Executer en tant qu'administrateur
  echo 2. Ou: Menu Démarrer ^> taper "cmd" ^> clic droit "Invite de commandes" ^> Executer en tant qu'administrateur
  echo    Puis:  cd c:\WORK1\maaxbete-app
  echo          npm run dev
  echo 3. Ou: Paramètres Windows ^> Mise à jour et sécurité ^> Sécurité Windows ^> Protection contre les virus ^> Paramètres ^> Exclusions ^> Ajouter c:\WORK1
)
echo.
pause
