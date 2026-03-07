# MAAXBETE — maaxbete.com

Site casino / paris sportifs inspiré de MAAXBET, avec tableau de bord admin, hiérarchie de comptes et gestion des soldes.

## Compte Master pour test

- **Adresse (login):** `master@maaxbete.com`
- **Mot de passe:** `Master2025!`

Utilisez ces identifiants pour vous connecter au **dashboard** (menu Connexion puis « Dashboard »), créer des comptes, effectuer des transferts et consulter l’historique.

## Règles des transferts

- **Master** peut transférer vers **tous** les comptes (superadmin, admin, cashier, player).
- **Superadmin** peut transférer uniquement vers **Admin**.
- **Admin** peut transférer uniquement vers **Cashier**.
- Seul le **Master** peut **créer** de nouveaux comptes (New User).

## Lancer le projet

```bash
cd maaxbete-app
npm install
npm run dev
```

Ouvrir **http://localhost:5178** (ou le port affiché) dans le navigateur.

**Avec base de données (stockage persistant)** : lancer aussi le proxy. Deux modes :

- **Fichiers JSON** (défaut) : si les variables MySQL ne sont pas configurées dans `.env`, les données sont stockées dans `data/` (users.json, transactions.json, game_settings.json).
- **MySQL** : si `DB_HOST`, `DB_NAME` et `DB_USER` sont renseignés dans `.env`, le proxy se connecte à MySQL, crée le compte master au premier démarrage si besoin, et enregistre tout (utilisateurs, transactions, mises, historique casino).

```bash
# Terminal 1
npm run proxy

# Terminal 2
npm run dev
```

À l’ouverture du site, si le proxy répond, le frontend utilise automatiquement l’API ; sinon il revient au mode démo (localStorage). Compte master par défaut : `master@maaxbete.com` / `Master2025!` (ou la valeur de `MASTER_INITIAL_PASSWORD` en MySQL).

### Configurer MySQL

1. Créer une base MySQL et un utilisateur dédié (ne pas utiliser `root` en production).
2. Exécuter le script de création des tables :  
   `mysql -u USER -p NOM_BASE < server/database/schema.sql`
3. Dans `.env` (voir `.env.example`), définir :  
   `DB_HOST=...` `DB_PORT=3306` `DB_NAME=...` `DB_USER=...` `DB_PASSWORD=...`
4. Redémarrer le proxy : `npm run proxy`. Au démarrage, la connexion est testée ; en cas d’échec, un message clair s’affiche (sans infos sensibles en production).

**Production** : `npm run build` puis déployer le dossier `dist`. Pour la persistance en production, déployer le serveur (proxy + `server/db.js`) et faire pointer le frontend vers son URL.

## Déploiement (GitHub, Vercel, Render, Railway)

| Service | Rôle | Lien |
|--------|------|------|
| **GitHub** | Code source | [gaythm16-gif/maaxbete-app](https://github.com/gaythm16-gif/maaxbete-app) |
| **Vercel** | Frontend (déjà déployé, lié à GitHub) | [maaxbete-app.vercel.app](https://maaxbete-app.vercel.app) |
| **Render** | Backend (API + proxy) | [Deploy avec Blueprint](https://dashboard.render.com/select-repo?type=blueprint&repo=https://github.com/gaythm16-gif/maaxbete-app) |
| **Railway** | MySQL | [New Project → Add MySQL](https://railway.app/new) puis recopier les variables dans Render |

- **Vercel** : lié au repo ; chaque push sur `main` redéploie le frontend. Variable `VITE_API_URL` = URL du backend Render (ex. `https://maaxbete-backend.onrender.com`).
- **Render** : après déploiement du Blueprint, ajouter dans Environment les variables DB (Railway), CASINO_* et `CASINO_SITE_ENDPOINT` / `CASINO_CALLBACK_URL`. Voir `DEPLOY.md` et `render.yaml`.
- **Railway** : créer une base MySQL, exécuter `server/database/schema.sql`, puis copier Host/User/Password/Database dans Render.

## Casino API (Nexus) et proxy

Le proxy tourne sur le port **3001** (`npm run proxy`). Il appelle l’API Nexus et gère le solde joueur. Pour que les jeux affichent le solde en TND, le fournisseur peut avoir besoin d’appeler ton serveur (callback). **Sans lien public**, ce callback n’est pas joignable depuis Internet.

### Obtenir une URL publique temporaire (sans hébergement)

En local, tu peux exposer le proxy avec **ngrok** pour avoir une URL publique le temps des tests :

1. Démarrer le proxy : `npm run proxy`
2. Dans un autre terminal : `npm run tunnel`  
   ngrok affiche une URL du type `https://xxxx.ngrok-free.app` → c’est ton lien public temporaire.
3. Dans le fichier **.env** du projet, ajoute (en remplaçant par l’URL ngrok affichée) :  
   `CASINO_CALLBACK_URL=https://xxxx.ngrok-free.app/api/casino/callback`
4. Dans le panneau Nexus (API Link Guide / paramètres), renseigne la même URL comme **Callback URL** si le fournisseur le demande.
5. Utilise le site comme d’habitude (localhost pour le front) ; les appels callback du jeu passeront par l’URL ngrok vers ton proxy.

Quand tu auras un vrai domaine (ex. maaxbete.com), tu mettras cette URL en `CASINO_CALLBACK_URL` et dans le panneau Nexus, et tu pourras arrêter ngrok.

## Structure

- **Site public** : Accueil, Paris sportifs, Paris en direct, Casino (jeux statiques), Live Casino (prêt pour API), Virtuels.
- **Dashboard** (après connexion) : New User, All Users, Tree, Transfers, History, Change Password, Users Profit, Transactions Profit.
- **Données** : Stockage local (localStorage) pour la démo ; à remplacer par une API backend pour la production.

## Domaine

Le site est configuré pour le domaine **maaxbete.com** (titre et branding). Aucun achat de domaine n’est effectué dans ce projet.
