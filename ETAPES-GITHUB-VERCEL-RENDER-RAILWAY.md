# Étapes pour voir le projet sur GitHub, Vercel, Render et Railway

Le projet est déjà commit en local. Suis ces étapes **dans l’ordre**.

---

## Étape 1 — Créer le dépôt sur GitHub

1. Ouvre **https://github.com/new** (connecté avec **gaythm16@gmail.com**).
2. **Repository name** : `maaxbete-app` (ou un autre nom si tu préfères).
3. **Public**.
4. Ne coche **pas** "Add a README file" (le projet en a déjà un).
5. Clique sur **Create repository**.

Sur la page du nouveau dépôt, GitHub affiche des commandes. Tu peux ignorer la partie "git init" et utiliser uniquement les commandes ci‑dessous (remote + push).

---

## Étape 2 — Lier le projet local et pousser vers GitHub

Ouvre un terminal dans le dossier du projet (`C:\WORK1\maaxbete-app`) et exécute :

**Si le repo s’appelle exactement `maaxbete-app` et ton compte est `gaythm16` :**

```bash
git remote add origin https://github.com/gaythm16/maaxbete-app.git
git push -u origin main
```

**Si le nom du repo ou le compte est différent**, remplace par ton URL, par exemple :

```bash
git remote add origin https://github.com/TON_COMPTE/NOM_DU_REPO.git
git push -u origin main
```

Si on te demande de te connecter à GitHub, utilise ton compte (gaythm16@gmail.com).

Après un `git push` réussi, le projet apparaît sur **GitHub**.

---

## Étape 3 — Vercel (frontend)

1. Va sur **https://vercel.com** et connecte-toi avec GitHub (gaythm16).
2. **Add New…** → **Project**.
3. Dans la liste des repos GitHub, choisis **maaxbete-app** (ou le nom que tu as utilisé).
4. Si le repo n’apparaît pas : **Configure GitHub** / **Adjust GitHub App** et autorise l’accès au repo.
5. **Import** :
   - Framework Preset : **Vite**.
   - Root Directory : laisser vide (racine du repo).
   - Environment Variables : ajoute **`VITE_API_URL`** (tu pourras la remplir après avoir déployé le backend sur Render).
6. Clique sur **Deploy**.

Quand le déploiement est terminé, tu auras une URL du type `https://maaxbete-app-xxx.vercel.app`. Le projet sera visible dans ton dashboard Vercel.

---

## Étape 4 — Render (backend)

1. Va sur **https://dashboard.render.com** et connecte-toi avec GitHub.
2. **New +** → **Web Service**.
3. Connecte le repo **maaxbete-app** (s’il n’apparaît pas, autorise Render à accéder à tes repos GitHub).
4. Choisis le repo **maaxbete-app**.
5. Paramètres :
   - **Name** : `maaxbete-backend` (ou autre).
   - **Region** : celle de ton choix.
   - **Branch** : `main`.
   - **Root Directory** : laisser vide.
   - **Build Command** : `npm install`
   - **Start Command** : `npm run proxy`
6. **Environment** : ajoute au minimum (les autres variables viendront après Railway) :
   - `NODE_ENV` = `production`
7. Clique sur **Create Web Service**.

Le premier déploiement peut échouer tant que tu n’as pas ajouté les variables MySQL (Railway). Une fois Railway et les variables configurés, redéploie. Le projet sera visible dans ton dashboard Render.

---

## Étape 5 — Railway (MySQL)

1. Va sur **https://railway.app** et connecte-toi avec GitHub.
2. **New Project**.
3. **Add service** → **Database** → **MySQL** (ou **Add MySQL** selon l’interface).
4. Une fois le service MySQL créé, ouvre-le.
5. Onglet **Variables** (ou **Connect**) : note **Host**, **Port**, **Database**, **User**, **Password**.
6. Optionnel : onglet pour exécuter du SQL → colle le contenu de **`server/database/schema.sql`** et exécute pour créer les tables.

Ensuite, dans **Render** → ton Web Service → **Environment**, ajoute :

- `DB_HOST` = valeur **Host** Railway  
- `DB_PORT` = **3306** (ou la valeur Port Railway)  
- `DB_NAME` = valeur **Database**  
- `DB_USER` = valeur **User**  
- `DB_PASSWORD` = valeur **Password**  

Puis **Save** et **Manual Deploy** (ou attendre le redéploiement). Le projet sera visible sur Railway (service MySQL).

---

## Récapitulatif

| Où | Ce que tu vois |
|----|------------------|
| **GitHub** | Repo `maaxbete-app` avec tout le code, après `git push`. |
| **Vercel** | Projet lié au repo, après Import et Deploy. |
| **Render** | Web Service lié au repo, après création du service. |
| **Railway** | Projet avec un service MySQL, après création de la base. |

Si le repo n’apparaît pas sur Vercel ou Render : vérifie que tu es bien connecté avec le bon compte GitHub (gaythm16) et que l’application GitHub de Vercel/Render a bien accès au repository **maaxbete-app**.
