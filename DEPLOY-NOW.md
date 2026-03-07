# Déploiement en 2 minutes (compte GitHub déjà lié)

Deux onglets ont été ouverts. Suis ces étapes dans l’ordre.

---

## 1. Render (backend) — onglet déjà ouvert

1. Sur **https://dashboard.render.com/select-repo?type=blueprint** :
   - Clique sur **Connect** à côté de **maaxbete-app** (ou choisis le repo `gaythm16-gif/maaxbete-app`).
2. Renseigne si demandé :
   - **Blueprint Path** : `render.yaml` (défaut)
   - **Branch** : `main`
3. Clique sur **Deploy Blueprint** (ou **Apply**).
4. Une fois le service créé, note l’URL du backend (ex. `https://maaxbete-backend.onrender.com`).
5. Dans le service **maaxbete-backend** → **Environment** : ajoute les variables (voir ci‑dessous). Tu pourras les remplir après avoir créé MySQL sur Railway.

---

## 2. Railway (MySQL) — onglet déjà ouvert

1. Sur **https://railway.app/new** :
   - Clique sur **Add a plugin** ou **Database** → **MySQL** (ou **Add MySQL**).
2. Une fois MySQL créé, ouvre le service → onglet **Variables** ou **Connect**.
3. Note : **MYSQLHOST**, **MYSQLPORT**, **MYSQLDATABASE**, **MYSQLUSER**, **MYSQLPASSWORD** (ou noms équivalents).
4. (Optionnel) Onglet **Data** ou **Query** : colle le contenu de `server/database/schema.sql` et exécute pour créer les tables.

---

## 3. Relier Render et Railway

1. **Render** → service **maaxbete-backend** → **Environment** → **Add Environment Variable**.
2. Ajoute (en utilisant les valeurs Railway) :
   - `DB_HOST` = MYSQLHOST  
   - `DB_PORT` = 3306 ou MYSQLPORT  
   - `DB_NAME` = MYSQLDATABASE  
   - `DB_USER` = MYSQLUSER  
   - `DB_PASSWORD` = MYSQLPASSWORD  
3. Ajoute aussi (si tu les as) :
   - `CASINO_API_URL` = `https://api.nexusggr.com`  
   - `CASINO_AGENT_CODE`, `CASINO_TOKEN`, `CASINO_SECRET` (depuis ton fournisseur)  
   - `CASINO_SITE_ENDPOINT` = `https://maaxbete-app.vercel.app`  
   - `CASINO_CALLBACK_URL` = `https://maaxbete-backend.onrender.com/api/casino/callback` (remplace par ton URL Render si différente)
4. **Save** puis **Manual Deploy** (ou attends le redéploiement).

---

## 4. Vercel (déjà fait)

- Frontend : **https://maaxbete-app.vercel.app**
- Variable `VITE_API_URL` = URL du backend Render (ex. `https://maaxbete-backend.onrender.com`). À vérifier dans Vercel → Project → Settings → Environment Variables.

---

**Liens directs :**

- [Render – New Blueprint](https://dashboard.render.com/select-repo?type=blueprint)
- [Railway – New Project](https://railway.app/new)
- [Vercel – maaxbete-app](https://vercel.com/wolfs-projects-fe2b3a14/maaxbete-app)
