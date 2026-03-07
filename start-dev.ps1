# Démarre Vite en arrière-plan (nouvelle fenêtre)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm.cmd run dev"
Start-Sleep -Seconds 6

# Ouvre le site dans le navigateur par défaut
Start-Process "http://localhost:5178"

Write-Host "Site demarre. Navigateur ouvert sur http://localhost:5178"
