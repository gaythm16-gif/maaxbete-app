# Deploy frontend sur Vercel
# 1) La premiere fois : ouvre le lien affiche et connecte-toi avec GitHub (gaythm16-gif)
# 2) Ensuite le deploy se lance

Set-Location $PSScriptRoot

Write-Host "Connexion Vercel (une seule fois)..." -ForegroundColor Cyan
vercel login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Connecte-toi dans le navigateur puis relance ce script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Deploiement du frontend sur Vercel..." -ForegroundColor Cyan
vercel --yes --prod

Write-Host "Termine. Ton URL sera affichee ci-dessus." -ForegroundColor Green
