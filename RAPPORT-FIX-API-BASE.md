# Rapport : correction "API_BASE is not defined"

## 1. Stack du projet

| Partie   | Stack              | Fichiers clés                          |
|----------|--------------------|----------------------------------------|
| Frontend | **React 19 + Vite 7** | `src/`, `vite.config.js`, `package.json` |
| Backend  | **Node + Express** | `server/casinoProxy.js`, `server/appRoutes.js` |
| Variables d’env frontend | **Vite** → `import.meta.env.VITE_*` uniquement | `.env`, `.env.example` |

---

## 2. Recherche de toutes les occurrences de `API_BASE`

### Backend (server/)

| Fichier            | Ligne | Usage |
|--------------------|-------|--------|
| `server/casinoProxy.js` | 21  | **Définition** : `const API_BASE = (process.env.CASINO_API_URL || 'https://api.nexusggr.com').replace(...)` |
| `server/casinoProxy.js` | 62, 76, 77, 465 | Utilisation de `API_BASE` (appels à l’API Casino Nexus). **Aucun problème.** |

### Frontend (src/)

| Fichier   | Ligne | Usage |
|-----------|-------|--------|
| `src/config/api.js` | 5 (commentaire) | Mention dans un commentaire uniquement. |
| `src/pages/Casino.jsx` | 216, 401 | **Gestion d’erreur** : détection du message "API_BASE is not defined" pour afficher un texte de remplacement. |
| `src/pages/LiveCasino.jsx` | 179, 315 | Idem. |

Aucun fichier frontend ne **déclare** ni n’**utilise** une variable nommée `API_BASE`.  
L’URL de base est fournie par `getCasinoApiBase()` et `getAppApiBase()` dans `src/config/api.js`.

---

## 3. Cause exacte du bug

- **Cause** : L’erreur "API_BASE is not defined" est une **ReferenceError** JavaScript côté **client**. Elle ne peut venir que d’un **ancien bundle** du frontend, généré à une époque où une partie du code (sans doute `launchGame` dans `nexusApi.js`) utilisait une variable `API_BASE` **non définie** dans le frontend (cette variable n’existe que dans le backend).
- **État actuel du code** : Dans le dépôt actuel, le frontend n’utilise plus jamais `API_BASE`. Il utilise uniquement :
  - `getAppApiBase()` et `getCasinoApiBase()` depuis `src/config/api.js`,
  - qui s’appuient sur `import.meta.env.VITE_API_URL` (Vite) et un fallback pour `maaxbete-app.vercel.app`.
- **Pourquoi l’erreur apparaît encore** : Le site en production (ex. Vercel) sert encore un **ancien build** (ancien JS), ou le **cache navigateur** sert l’ancien script. Ce vieux bundle contient l’ancien code qui référençait `API_BASE`, d’où la ReferenceError et le message affiché.

Résumé : **le bug est déjà corrigé dans le code ; le problème restant est le déploiement / cache qui sert un ancien bundle.**

---

## 4. Fichiers modifiés (pour renforcement et clarté)

- **`src/config/api.js`**  
  - Commentaire en tête de fichier précisant : seule source d’URL backend pour le frontend, usage de `import.meta.env.VITE_*`, et ne jamais utiliser de variable nommée `API_BASE` dans le frontend.  
  - Aucun changement de logique.

Aucun autre fichier n’a été modifié pour ce correctif. Les fichiers suivants étaient déjà corrects et n’ont pas été touchés :

- `src/services/nexusApi.js` : utilise `getCasinoApiBase()` (via `getCasinoBase()`).
- `src/services/appApi.js` : utilise `getAppApiBase()`.
- `src/pages/Casino.jsx` / `LiveCasino.jsx` : affichage d’erreur qui remplace le message "API_BASE is not defined" par un texte invitant à actualiser la page.

---

## 5. Variables d’environnement

### Frontend (build Vite / Vercel)

- **`VITE_API_URL`** (optionnel en production pour `maaxbete-app.vercel.app`)  
  - Exemple : `https://maaxbete-backend.onrender.com`  
  - Si non définie, le code utilise le fallback dans `getBackendBaseUrl()` pour ce domaine.

### Backend (Render)

- Déjà documentées dans `.env.example` (DB_*, CASINO_*, FRONTEND_URL, etc.). Aucune variable supplémentaire nécessaire pour ce correctif.

---

## 6. Vérifications effectuées

- Recherche de `API_BASE` dans tout le dépôt (backend + frontend).
- Lecture de `src/config/api.js`, `src/services/nexusApi.js`, `src/services/appApi.js` : aucune référence à une variable `API_BASE` côté frontend.
- Build production : `npm run build` → succès.
- Contenu du bundle : recherche de `API_BASE` dans `dist/assets/index-*.js` → seules présences dans des **chaînes de caractères** (gestion d’erreur), pas comme identifiant → **aucun risque de ReferenceError** avec le build actuel.

---

## 7. Commandes à exécuter (pour que l’erreur disparaisse en production)

1. **Déployer le dernier code** (déjà poussé sur `main`) :
   - Vercel : déclenche un déploiement automatique au push ; sinon, **Redeploy** manuel avec **Clear Build Cache and Redeploy**.
2. **Côté utilisateur** : vider le cache du site ou forcer le rechargement (Ctrl+Shift+R ou Cmd+Shift+R) sur la page Casino.

---

## 8. Résultat attendu après déploiement + rechargement

- Plus de ReferenceError "API_BASE is not defined".
- Liste des jeux chargée (depuis l’API ou liste démo).
- Clic sur un jeu : ouverture de l’iframe (URL réelle ou page de repli « démo » selon la config API).
- Aucune utilisation de `API_BASE` dans le frontend ; tout passe par `src/config/api.js` et les fonctions exportées.

---

## 9. Récapitulatif

- **Cause** : ancien bundle frontend qui utilisait une variable `API_BASE` non définie côté client.
- **Correction dans le code** : déjà en place (URL via `config/api.js` + `import.meta.env.VITE_API_URL`).
- **Action restante** : déployer le build actuel et éviter l’ancien cache (Vercel + navigateur).
