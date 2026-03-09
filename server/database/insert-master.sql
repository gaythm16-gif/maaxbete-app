-- Créer le compte master manuellement (si ensureMaster n'a pas pu le faire au démarrage).
-- À exécuter dans Railway → MySQL → Query/Console, APRÈS avoir exécuté schema.sql.
-- Login : master@maaxbete.com  |  Mot de passe : Master2025!

INSERT INTO users (
  id, account_id, login, email, password_hash, role, balance, currency,
  parent_id, status, win_percentage, created_at, updated_at
) VALUES (
  'master-1', 1, 'master@maaxbete.com', NULL,
  '$2b$10$sj9c.SQOzU7EuidvBzMNCO17WXGtUwIGPH3usbOn3ZYgDPVtua4Xa',
  'master', 100000, 'TND', NULL, 'active', NULL, UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000
) ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  updated_at = UNIX_TIMESTAMP()*1000;
