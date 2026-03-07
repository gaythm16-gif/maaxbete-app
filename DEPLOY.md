# Déploiement en production — GitHub, Railway, Render, Vercel

Ce guide décrit les étapes exactes pour déployer le projet (frontend sur Vercel, backend sur Render, MySQL sur Railway), sans casser les fonctionnalités existantes.

---

## A. Structure du projet

- **Un seul dépôt GitHub** : frontend (Vite/React) et backend (Express) dans le même repo `maaxbete-app`.
- **Frontend** : `src/`, `public/`, `index.html`, `vite.config.js` — build Vite → `dist/`.
- **Backend** : `server/` (casinoProxy.js, appRoutes, db, config, database).
- **MySQL** : configuré via variables d’environnement (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD).
- **Pas de localhost en production** : le frontend appelle le backend via `VITE_API_URL` (URL Render) ; le backend utilise `FRONTEND_URL` (URL Vercel) pour CORS.

---

## B. Fichiers modifiés ou créés

### Fichiers modifiés
- `server/casinoProxy.js` — PORT (process.env.PORT pour Render), CORS (FRONTEND_URL en prod), pas de log localhost en prod.
- `src/services/appApi.js` — base URL API via `VITE_API_URL` (vide en dev = proxy Vite).
- `src/services/nexusApi.js` — idem, base URL via `VITE_API_URL`.
- `.env.example` — complété (backend + frontend), sans valeurs sensibles.
- `.gitignore` — ajout de `.env.local`, `.env.production`, `.env.*.local`.

### Fichiers créés
- `vercel.json` — rewrites SPA (toutes les routes → index.html).
- `DEPLOY.md` — ce guide.

---

## C. Variables d’environnement

### Backend (Render)
À créer dans le dashboard Render → Service → Environment.

| Variable | Description | Exemple |
|----------|-------------|--------|
| `NODE_ENV` | production | `production` |
| `PORT` | (fourni par Render, optionnel à définir) | — |
| `DB_HOST` | Hôte MySQL (Railway) | valeur Railway |
| `DB_PORT` | Port MySQL | `3306` ou valeur Railway |
| `DB_NAME` | Nom de la base | valeur Railway |
| `DB_USER` | Utilisateur MySQL | valeur Railway |
| `DB_PASSWORD` | Mot de passe MySQL | valeur Railway |
| `FRONTEND_URL` | URL du frontend (Vercel) pour CORS | `https://ton-projet.vercel.app` |
| `CASINO_API_URL` | URL API Nexus | `https://api.nexusggr.com` |
| `CASINO_AGENT_CODE` | Code agent | (ton code) |
| `CASINO_TOKEN` | Token API | (secret) |
| `CASINO_SECRET` | Secret API | (secret) |
| `CASINO_SITE_ENDPOINT` | URL du site (frontend) pour l’API casino | même que FRONTEND_URL |
| `CASINO_CALLBACK_URL` | (optionnel) URL callback publique du backend | `https://ton-backend.onrender.com/api/casino/callback` |

### Frontend (Vercel)
À créer dans Vercel → Project → Settings → Environment Variables.

| Variable | Description | Exemple |
|----------|-------------|--------|
| `VITE_API_URL` | URL du backend (Render) | `https://ton-backend.onrender.com` |

Ne pas mettre de slash final. En local, ne pas définir `VITE_API_URL` pour que le proxy Vite soit utilisé.

### MySQL (Railway)
Railway fournit des variables (ex. `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`). Tu les recopies dans Render comme suit :

- `DB_HOST` = valeur **MYSQLHOST** (ou équivalent Railway)
- `DB_PORT` = **3306** ou valeur fournie
- `DB_NAME` = valeur **MYSQLDATABASE**
- `DB_USER` = valeur **MYSQLUSER**
- `DB_PASSWORD` = valeur **MYSQLPASSWORD**

---

## D. Commandes à exécuter

### 1. GitHub (dans le dossier du projet)

```bash
cd C:\WORK1\maaxbete-app
git init
git add .
git status
git commit -m "Initial commit - prêt pour déploiement"
git branch -M main
git remote add origin https://github.com/gaythm16/maaxbete-app.git
git push -u origin main
```

(Remplace `gaythm16/maaxbete-app` par ton repo si différent.)

### 2. Backend (Render) — après création du service

- Build command : `npm install` (ou laisser vide si Render détecte Node).
- Start command : `npm run proxy` ou `node server/casinoProxy.js`.
- Root directory : racine du repo (pas `server/`).

### 3. Frontend (Vercel)

- Framework : Vite (auto-détecté).
- Build command : `npm run build`.
- Output directory : `dist`.
- Variables d’environnement : `VITE_API_URL` = URL du backend Render.

---

## E. Étapes exactes à suivre

### 1. Créer le repo GitHub

1. Va sur https://github.com/new (connecté avec gaythm16@gmail.com).
2. Nom du repo : `maaxbete-app` (ou autre).
3. Ne coche pas « Initialize with README » si tu fais un push existant.
4. Crée le repo.

### 2. Pousser le projet sur GitHub

Dans un terminal (dossier du projet) :

```bash
cd C:\WORK1\maaxbete-app
git init
git add .
git commit -m "Initial commit - production ready"
git branch -M main
git remote add origin https://github.com/gaythm16/maaxbete-app.git
git push -u origin main
```

Vérifier que `.env` n’est pas poussé : `git status` ne doit pas lister `.env`.

### 3. Créer MySQL sur Railway

1. Va sur https://railway.app (connecté avec GitHub).
2. New Project → Add MySQL (ou « Database » → MySQL).
3. Une fois le service créé, ouvre-le → onglet **Variables** (ou **Connect**).
4. Note : **Host**, **Port**, **Database**, **User**, **Password** (ou l’URL fournie).
5. Si Railway donne une seule URL : décompose-la en DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD pour Render.

### 4. Exécuter le script SQL sur Railway

- Dans Railway, ouvre ton MySQL → onglet pour exécuter du SQL (ou utilise un client avec les identifiants Railway).
- Copie le contenu de `server/database/schema.sql` et exécute-le pour créer les tables.

### 5. Déployer le backend sur Render

1. https://dashboard.render.com → New → Web Service.
2. Connecte le repo GitHub `maaxbete-app`.
3. Config :
   - **Build Command** : `npm install`
   - **Start Command** : `npm run proxy`
   - **Root Directory** : (vide = racine)
4. Environment :
   - `NODE_ENV` = `production`
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (valeurs Railway)
   - `FRONTEND_URL` = (tu le mettras après Vercel, ex. `https://maaxbete-app.vercel.app`)
   - `CASINO_*` comme dans ton .env actuel (sans les mettre en dur dans le code)
5. Créer le service. Note l’URL du backend (ex. `https://maaxbete-app-xxxx.onrender.com`).

### 6. Ajouter les variables sur Render

Dans Render → ton service → Environment : ajoute toutes les variables listées en section C (Backend). Pour `FRONTEND_URL` et `CASINO_SITE_ENDPOINT`, utilise l’URL Vercel une fois le front déployé.

### 7. Déployer le frontend sur Vercel

1. https://vercel.com → Add New → Project.
2. Importe le repo GitHub `maaxbete-app`.
3. Framework Preset : Vite.
4. Environment Variables : ajoute `VITE_API_URL` = URL du backend Render (ex. `https://maaxbete-app-xxxx.onrender.com`), sans slash final.
5. Deploy. Note l’URL du frontend (ex. `https://maaxbete-app.vercel.app`).

### 8. Revenir sur Render (CORS)

Dans Render → Environment : mets à jour `FRONTEND_URL` et `CASINO_SITE_ENDPOINT` avec l’URL Vercel exacte. Redéploie si besoin.

### 9. Tester le site en production

1. Ouvre l’URL Vercel.
2. Connexion : master@maaxbete.com / Master2025! (ou le mot de passe défini par MASTER_INITIAL_PASSWORD si tu l’as mis sur Render).
3. Vérifier : création de compte, connexion, solde, transferts, historique, jeux casino (si l’API Nexus est configurée).

---

## F. Contraintes respectées

- Aucune fonctionnalité existante supprimée.
- Aucun secret en dur : tout passe par les variables d’environnement.
- Aucun localhost en configuration de production : frontend utilise `VITE_API_URL`, backend utilise `FRONTEND_URL` et `CASINO_SITE_ENDPOINT`.
- Un seul repo : frontend + backend ensemble ; Render lance le backend via `npm run proxy`, Vercel build le frontend avec `npm run build`.

---

## Script SQL (Railway)

Le fichier `server/database/schema.sql` contient la création des tables. Tu peux l’exécuter dans l’interface SQL de Railway (ou avec un client MySQL connecté à Railway) pour créer `users`, `games`, `transactions`, `bets`, `game_history`, `game_settings`.
