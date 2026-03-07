-- Schéma MySQL pour maaxbete-app
-- Exécuter après création de la base : mysql -u USER -p DB_NAME < server/database/schema.sql
-- Ne pas utiliser l'utilisateur root en production.

-- Utilisateurs (comptes joueurs, master, partenaires)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  login VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('master', 'partner', 'superadmin', 'admin', 'cashier', 'player') NOT NULL DEFAULT 'player',
  balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'TND',
  parent_id VARCHAR(64) DEFAULT NULL,
  status ENUM('active', 'banned') NOT NULL DEFAULT 'active',
  win_percentage DECIMAL(5, 2) DEFAULT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uk_login (login),
  INDEX idx_users_parent (parent_id),
  INDEX idx_users_status (status),
  INDEX idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optionnel : clé étrangère parent (décommenter après première création si souhaité)
-- ALTER TABLE users ADD CONSTRAINT fk_users_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL;

-- Jeux (référentiel)
CREATE TABLE IF NOT EXISTS games (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(128) DEFAULT NULL,
  type VARCHAR(64) DEFAULT NULL,
  image VARCHAR(512) DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  external_id VARCHAR(128) DEFAULT NULL,
  INDEX idx_games_provider (provider),
  INDEX idx_games_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions (dépôt, retrait, transfert, mise, gain, création compte, connexion)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  from_id VARCHAR(64) DEFAULT NULL,
  to_id VARCHAR(64) DEFAULT NULL,
  amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  status VARCHAR(32) DEFAULT 'completed',
  note TEXT,
  created_at BIGINT NOT NULL,
  INDEX idx_tx_user (user_id),
  INDEX idx_tx_type (type),
  INDEX idx_tx_created (created_at),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_from FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_to FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mises (chaque coup joué)
CREATE TABLE IF NOT EXISTS bets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  game_id INT UNSIGNED DEFAULT NULL,
  bet_amount DECIMAL(18, 2) NOT NULL,
  win_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  result ENUM('win', 'lose') NOT NULL,
  balance_before DECIMAL(18, 2) NOT NULL,
  balance_after DECIMAL(18, 2) NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_bets_user (user_id),
  INDEX idx_bets_game (game_id),
  INDEX idx_bets_created (created_at),
  CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bets_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historique des parties
CREATE TABLE IF NOT EXISTS game_history (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  game_id INT UNSIGNED DEFAULT NULL,
  bet_amount DECIMAL(18, 2) NOT NULL,
  win_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
  result ENUM('win', 'lose') NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_gh_user (user_id),
  INDEX idx_gh_game (game_id),
  INDEX idx_gh_created (created_at),
  CONSTRAINT fk_gh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_gh_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paramètres globaux
CREATE TABLE IF NOT EXISTS game_settings (
  id TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  win_percentage DECIMAL(5, 2) NOT NULL DEFAULT 80,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO game_settings (id, win_percentage, updated_at)
VALUES (1, 80, ROUND(UNIX_TIMESTAMP() * 1000))
ON DUPLICATE KEY UPDATE updated_at = ROUND(UNIX_TIMESTAMP() * 1000);
