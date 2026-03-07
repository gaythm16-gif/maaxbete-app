# Deploy backend + MySQL sur Railway
# 1) La premiere fois : railway login (ouvre le navigateur)
# 2) Puis : railway init ou railway link pour lier le projet
# 3) Ajoute un service MySQL dans le dashboard Railway, puis les variables dans Render

Set-Location $PSScriptRoot

Write-Host "Connexion Railway (une seule fois)..." -ForegroundColor Cyan
railway login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Connecte-toi dans le navigateur puis relance ce script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Lier ce dossier a un projet Railway (choisir 'Empty Project' si nouveau)..." -ForegroundColor Cyan
railway link

Write-Host "Pour le backend: ajoute un service Web, Build: npm install, Start: npm run proxy" -ForegroundColor Yellow
Write-Host "Pour la BDD: dans le dashboard Railway, Add Service -> MySQL" -ForegroundColor Yellow
