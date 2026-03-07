# Intégration API Casino Maaxbet

## Identifiants (déjà configurés dans `.env`)

- **Token :** `cfa0788b47e2273e728b07388385f545`
- **Secret :** `76e1c9f5fb38c27a17b9bd0772943ff3`
- **URL API par défaut :** `https://api.nexusggr.com`

## Lancer le site avec l’API

1. **Démarrer le proxy** (un terminal) :
   ```bash
   cd c:\WORK1\maaxbete-app
   npm run proxy
   ```
   Le proxy écoute sur **http://localhost:3001**.

2. **Démarrer le frontend** (un autre terminal) :
   ```bash
   npm run dev
   ```
   Ouvrir **http://localhost:5178** → menu **Casino**.

3. Les jeux et providers viennent de l’API. En cliquant sur un jeu (une fois connecté), le joueur ouvre l’URL de jeu fournie par l’API.

## Si vous voyez une erreur type « IP non autorisée » (403 / 401)

Cela vient en général de l’**IP whitelist** côté fournisseur d’API :

1. **Récupérer votre IP publique**  
   Ouvrir par exemple : **https://api.ipify.org** (ou « what is my ip » dans un moteur de recherche).

2. **Ajouter cette IP dans le panneau du fournisseur**  
   Dans la section prévue (souvent « IP Whitelist », « Allowed IPs », « API Access »), ajoutez l’IP affichée.

3. **Vérifier l’URL de l’API**  
   Si votre fournisseur vous a donné une URL différente, mettez-la dans `.env` :
   ```env
   CASINO_API_URL=https://votre-url-api.com
   ```

4. **Vérifier Token / Secret**  
   Vérifiez dans le panneau que le **Token** et le **Secret** correspondent bien à ceux dans `.env` (`CASINO_TOKEN`, `CASINO_SECRET`).

Tant que l’API bloque (403/401), le site affiche une **liste de démo** avec un message d’erreur expliquant de vérifier l’IP whitelist et l’URL API.
