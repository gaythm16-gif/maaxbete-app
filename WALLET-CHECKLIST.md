# Checklist : faire afficher le vrai solde (CREDIT) dans le jeu

Pour que la case **CREDIT** dans le jeu (au lieu de Rp0.00) affiche le vrai solde du joueur et que les jeux fonctionnent, suivez ces étapes **dans l’ordre**.

---

## A. Backend (Render)

1. **Ouvrir** : [Render Dashboard](https://dashboard.render.com) → service **maaxbete-backend** → **Environment**.

2. **Vérifier / ajouter** ces variables :

   | Variable | Valeur (exemple) |
   |----------|-------------------|
   | `CASINO_CALLBACK_URL` | `https://maaxbete-backend.onrender.com/api/casino/callback` |
   | `CASINO_API_URL` | `https://api.nexusggr.com` |
   | `CASINO_AGENT_CODE` ou `CASINO_TOKEN` | (valeur fournie par Nexus) |
   | `CASINO_SECRET` ou `CASINO_TOKEN` | (valeur fournie par Nexus) |
   | `FRONTEND_URL` | `https://maaxbete-app.vercel.app` |
   | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | (valeurs Railway) |

3. **Important** : l’URL dans `CASINO_CALLBACK_URL` doit être **exactement** celle que vous enregistrerez dans le panneau Nexus (étape B). Pas d’espace, pas de slash final.

4. **Sauvegarder** puis **Manual Deploy** (ou attendre le prochain déploiement).

---

## B. Panneau API Nexus

1. **Se connecter** au panneau d’administration de l’API casino (Nexus / fournisseur).

2. **Trouver** la section du type :
   - « Callback URL » / « Wallet URL » / « Balance URL » / « API Callback »  
   ou
   - « Paramètres d’intégration » / « Wallet integration ».

3. **Renseigner** l’URL callback :
   ```
   https://maaxbete-backend.onrender.com/api/casino/callback
   ```
   (Remplacez par l’URL réelle de votre backend si différente.)

4. **Enregistrer** les paramètres. Si une whitelist IP est demandée pour les callbacks, ajoutez l’IP du serveur Nexus (ou laissez vide si le provider ne l’exige pas).

---

## C. Vérifier que le callback répond

1. **Ouvrir** dans un navigateur (en étant connecté avec un compte qui a du solde) :
   ```
   https://maaxbete-backend.onrender.com/api/casino/callback?user_code=VOTRE_LOGIN
   ```
   Remplacez `VOTRE_LOGIN` par le login du compte (ex. `master@maaxbete.com`).

2. **Réponse attendue** (exemple avec solde 100) :
   ```json
   {"status":1,"balance":100,"currency":"TND","error":0}
   ```

3. Si vous voyez `user introuvable` ou `balance: 0` alors que le compte a du solde : vérifier le login (sensible à la casse selon la config) et que la base MySQL est bien connectée (variables DB_* sur Render).

---

## D. Tester le jeu

1. **Aller** sur https://maaxbete-app.vercel.app (ou votre URL front).

2. **Se connecter** avec un compte qui a un **solde > 0** (ex. master@maaxbete.com).

3. **Ouvrir** la page Casino, cliquer sur un jeu (ex. The Dog House).

4. **Vérifier** dans le jeu :
   - La case **CREDIT** doit afficher un montant **> 0** (votre solde ou l’équivalent dans la devise du jeu).
   - Vous devez pouvoir **placer une mise** sans message « Insufficient funds ».

5. Si **CREDIT reste à 0** :
   - Vérifier les logs Render au démarrage : il ne doit **pas** y avoir le message `CASINO_CALLBACK_URL non défini`.
   - Vérifier que l’URL callback dans le panneau Nexus est **exactement** la même que `CASINO_CALLBACK_URL` sur Render.
   - **Logs Render** : lors de l’ouverture d’un jeu, chercher `[Casino Callback]` dans les logs. Vous y verrez les paramètres (query/body) envoyés par Nexus. Si aucun log n’apparaît, Nexus n’appelle pas votre callback (vérifier le champ « Site Endpoint » ou « Callback URL » dans le panneau).
   - Certains providers attendent le solde en **centimes** : sur Render, ajouter la variable `CASINO_BALANCE_IN_CENTS` = `true`, redéployer, puis réessayer.
   - L’identifiant joueur peut varier (`user_code`, `user_id`, `player_id`, etc.) : le backend accepte plusieurs noms. Si Nexus envoie un **id numérique**, le backend tente de retrouver l’utilisateur par `id` en base.

---

## E. Après une partie (optionnel)

- **Actualiser le solde** sur le site (bouton « Actualiser le solde » sur la page Casino) pour voir le nouveau solde après mises/gains.
- Les mises et gains sont enregistrés en base (table `transactions`, type BET/WIN).

---

## F. Tester la liaison (script A→Z)

Pour vérifier que le backend répond correctement à tous les appels (balance, callback GET/POST, launch) :

```bash
# Test contre le backend local (lancer d’abord : npm run proxy)
npm run test:casino

# Test contre Render (remplacer par votre login)
BASE_URL=https://maaxbete-backend.onrender.com TEST_USER=master@maaxbete.com npm run test:casino
```

Tous les tests doivent afficher ✓. En cas d’échec, corriger l’endpoint ou le compte (TEST_USER) avant de retester le jeu.

---

## Résumé

| Problème | Action |
|----------|--------|
| CREDIT = 0 dans le jeu | Vérifier A + B + C (callback URL définie partout et GET callback qui retourne le bon solde). |
| Callback « user introuvable » | Vérifier que le login envoyé par le provider (user_code / user_id) correspond au login en base. |
| Solde toujours 0 après config | Essayer `CASINO_BALANCE_IN_CENTS=true` sur Render (certaines APIs veulent un entier en centimes). |
| Jeu en Rp au lieu de TND | Souvent réglage côté provider (devise par défaut). Le backend envoie déjà `currency: 'TND'` dans le callback. |

Une fois A, B et C corrects, la case CREDIT du jeu doit afficher le vrai solde et les jeux doivent fonctionner.
