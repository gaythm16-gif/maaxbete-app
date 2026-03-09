# Guide : faire fonctionner MySQL (Render + Railway)

Tu gardes les variables DB. Suis ces étapes **dans l’ordre** pour que le backend se connecte à MySQL et que le déploiement passe en Live.

---

## Si tu vois « getaddrinfo ENOTFOUND mysql.railway.internal » au login

C’est parce que **DB_HOST** sur Render vaut encore **mysql.railway.internal** (host privé). Render ne peut pas joindre ce host. Fais **exactement** ceci :

1. **Railway** → projet → service **MySQL** → onglet **Settings** → clique sur **Generate Domain** (icône éclair). Note le **host public** affiché (ex. `xxx.proxy.rlwy.net`). S’il n’apparaît pas dans Variables, regarde dans **Connect** / **Public URL**.
2. **Render** → **maaxbete-backend** → **Environment** → modifie **DB_HOST** : supprime `mysql.railway.internal` et mets le **host public** noté à l’étape 1 (ex. `monorail.proxy.rlwy.net`).
3. **Save, rebuild, and deploy** sur Render. Attends la fin du déploiement, puis réessaie de te connecter sur https://maaxbete-app.vercel.app.

Sans ça, l’erreur et les **500** sur `/api/app/login` continueront.

---

## Étape 1 — Vérifier que MySQL est accessible depuis Internet (Railway)

Render et Railway sont sur des serveurs différents. MySQL sur Railway doit accepter les connexions **depuis l’extérieur**.

1. Va sur **https://railway.app** → ton projet → service **MySQL**.
2. Ouvre l’onglet **Settings** (ou **Variables** / **Connect**).
3. Cherche une option du type :
   - **Public Networking** / **Expose publicly**
   - **Public URL** / **Connect from outside**
4. **Active** l’accès public si ce n’est pas déjà fait.
5. Dans l’onglet **Variables**, note **exactement** (copier-coller) :
   - **MYSQLHOST** (ou Host)
   - **MYSQLPORT** (souvent 3306 ou un numéro)
   - **MYSQLDATABASE**
   - **MYSQLUSER**
   - **MYSQLPASSWORD**

Si tu ne trouves pas “Public networking”, Railway expose souvent MySQL via un host du type **xxx.proxy.rlwy.net** — dans ce cas c’est déjà public. Passe à l’étape 2.

---

## Étape 2 — Vérifier les variables sur Render

Les valeurs sur Render doivent être **identiques** à celles de Railway.

1. Va sur **https://dashboard.render.com** → **maaxbete-backend** → **Environment**.
2. Pour **chaque** variable, compare avec Railway :

   | Sur Render   | Doit être exactement |
   |-------------|-----------------------|
   | **DB_HOST** | **Uniquement l’hôte** : si MYSQLHOST = `xxx.proxy.rlwy.net:17883`, mets `xxx.proxy.rlwy.net` (sans le `:17883`) |
   | **DB_PORT** | Le **port public** : si MYSQLHOST contient `:17883`, mets `17883` ; sinon MYSQLPORT (souvent `3306`) |
   | **DB_NAME** | La valeur **MYSQLDATABASE** de Railway |
   | **DB_USER** | La valeur **MYSQLUSER** de Railway |
   | **DB_PASSWORD** | La valeur **MYSQLPASSWORD** de Railway |

3. Vérifie :
   - Pas d’espace avant ou après les valeurs.
   - Pas de guillemets autour des valeurs.
   - **DB_HOST** = bien l’hôte (pas une URL complète).
4. Si tu as corrigé quelque chose : **Save, rebuild, and deploy**.

---

## Étape 3 — Créer les tables MySQL (Railway)

Sans les tables, tu auras l’erreur **« Table 'railway.users' doesn't exist »** au login. Deux possibilités :

### Option A — Script depuis ta machine (recommandé si tu as Node en local)

1. Dans la **racine du projet**, ouvre le fichier **.env** (crée-le s’il n’existe pas).
2. Mets les **mêmes** valeurs que sur Render, en ajoutant **obligatoirement** le mot de passe Railway :
   - **DB_HOST** = host public Railway (ex. `shinkansen.proxy.rlwy.net`)
   - **DB_PORT** = port Railway (ex. `17883`)
   - **DB_NAME** = base Railway (ex. `railway`)
   - **DB_USER** = utilisateur Railway (ex. `root`)
   - **DB_PASSWORD** = **MYSQLPASSWORD** copié depuis Railway → Variables (sans guillemets)
3. Enregistre le fichier, puis dans un terminal à la racine du projet :
   ```bash
   node scripts/run-schema-on-railway.js
   ```
4. Si tu vois « DB_PASSWORD est requis », c’est que **DB_PASSWORD** est vide dans .env : ajoute la valeur **MYSQLPASSWORD** de Railway.

**Sans mettre le mot de passe dans .env** (une seule fois) : assure-toi que .env contient au moins DB_HOST, DB_PORT, DB_NAME, DB_USER (les mêmes que sur Render). Puis dans PowerShell à la racine du projet :
   ```powershell
   $env:DB_PASSWORD="COLLE_ICI_MYSQLPASSWORD_RAILWAY"; node scripts/run-schema-on-railway.js
   ```
   Remplace `COLLE_ICI_MYSQLPASSWORD_RAILWAY` par la valeur **MYSQLPASSWORD** de Railway → Variables. Le mot de passe ne sera pas enregistré dans un fichier.

### Option B — Exécuter le SQL à la main sur Railway

1. Ouvre le fichier **server/database/schema.sql** dans ton projet (Cursor).
2. Sélectionne **tout** le contenu (Ctrl+A) et **copie**.
3. Va sur **Railway** → service **MySQL**.
4. Ouvre l’onglet **Data** ou **Query** (ou **MySQL Console** / **Query**).
5. **Colle** tout le contenu de **schema.sql** dans la zone de requête.
6. Clique sur **Run** / **Execute** / **Exécuter**.
7. Vérifie qu’il n’y a pas d’erreur (les tables `users`, `transactions`, etc. sont créées).

Si tu as déjà exécuté **schema.sql** avant, tu peux ignorer cette étape.

---

## Étape 4 — Redéployer le backend (Render)

1. **Render** → **maaxbete-backend**.
2. Clique sur **Manual Deploy** (ou **Deploy** → **Deploy latest commit**).
3. Choisis la branche **main** et lance le déploiement.
4. Va dans **Logs** et attends la fin du déploiement.

Tu dois voir soit :
- **`[DB] Connexion MySQL OK`** puis **`[DB] Stockage : MySQL`** → tout va bien.
- Ou **`[DB] Erreur de connexion à la base de données`** → reviens à l’étape 1 et 2 (accès public Railway + variables Render).

---

## Étape 5 — Si le déploiement est Live mais “mot de passe incorrect”

Le compte master doit exister en base.

1. Ouvre **server/database/reset-master-password.sql** dans ton projet.
2. Copie tout le contenu.
3. **Railway** → MySQL → **Query** / **Console** → colle le SQL → **Run**.
4. Réessaie de te connecter sur **https://maaxbete-app.vercel.app** avec :
   - **master@maaxbete.com**
   - **Master2025!**

---

## Récapitulatif

1. **Railway** : MySQL accessible depuis Internet + noter les 5 valeurs.
2. **Render** : **Environment** → DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD = exactement les valeurs Railway.
3. **Railway** : exécuter **schema.sql** dans la console MySQL.
4. **Render** : **Manual Deploy**, vérifier les **Logs**.
5. Si besoin : exécuter **reset-master-password.sql** sur Railway puis se connecter.

Si après l’étape 4 les logs affichent encore **Erreur de connexion à la base de données**, envoie une capture des **Variables** Railway (sans le mot de passe si tu préfères) et on vérifiera ensemble.
