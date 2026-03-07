# Base de données MySQL

## Script SQL

Le fichier `schema.sql` crée toutes les tables nécessaires :

- **users** : comptes (login, password_hash bcrypt, role, balance, currency, etc.)
- **games** : référentiel jeux (optionnel)
- **transactions** : dépôts, retraits, transferts, mises, gains, connexions
- **bets** : chaque mise avec solde avant/après
- **game_history** : historique des parties
- **game_settings** : paramètres globaux (ex. pourcentage de gain)

## Création de la base

```bash
# Créer la base (avec un compte MySQL non-root)
mysql -u VOTRE_USER -p -e "CREATE DATABASE IF NOT EXISTS maaxbete CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Créer les tables
mysql -u VOTRE_USER -p maaxbete < server/database/schema.sql
```

## Connexion

Variables dans `.env` (voir `.env.example`) :

- `DB_HOST` : hôte MySQL
- `DB_PORT` : 3306 par défaut
- `DB_NAME` : nom de la base
- `DB_USER` : utilisateur (ne pas utiliser root en production)
- `DB_PASSWORD` : mot de passe

Au démarrage du proxy (`npm run proxy`), la connexion est testée. En cas d’échec, un message clair s’affiche (sans informations sensibles en production).

## Premier démarrage

Si la base est vide, le compte **master** est créé automatiquement :

- Login : `master@maaxbete.com`
- Mot de passe : `Master2025!` (ou la valeur de `MASTER_INITIAL_PASSWORD` dans `.env`)

Modifier le mot de passe après la première connexion (Change Password dans le dashboard).
