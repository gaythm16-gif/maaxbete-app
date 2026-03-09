# Vérifier que l’API fonctionne

## Tests effectués (exemples de résultats)

- **Backend health** : `GET https://maaxbete-backend.onrender.com/api/app/health`  
  → `{ "ok": true, "db": "mysql" }`

- **IP sortante (whitelist Casino)** : `GET https://maaxbete-backend.onrender.com/api/casino/my-ip`  
  → `{ "ok": true, "ip": "74.220.48.240", "ipv6": "..." }`  
  L’IP affichée doit être ajoutée dans la whitelist du panneau API Casino (Nexus) si les jeux ne se chargent pas.

## IPv4 / IPv6

- Le frontend (navigateur) utilise l’URL du backend ; le choix IPv4 ou IPv6 est géré par le navigateur et le réseau.
- Pour l’API Casino externe, c’est l’**IP sortante du backend** (Render) qui compte : utilisez `/api/casino/my-ip` pour la voir et la mettre en whitelist. En général une adresse **IPv4** suffit.

## Après déploiement

1. **Vercel** : la variable `VITE_API_URL` peut être `https://maaxbete-backend.onrender.com` (ou laissée vide : un fallback pointe déjà vers cette URL pour `maaxbete-app.vercel.app`).
2. **Rafraîchissement** : après un nouveau déploiement, faire **Ctrl+Shift+R** (ou Cmd+Shift+R) sur la page Casino pour charger le nouveau JavaScript.
3. Si un jeu ne se lance pas : vérifier la whitelist IP avec l’IP retournée par `/api/casino/my-ip`.
