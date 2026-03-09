-- RÉINITIALISER le mot de passe du compte master
-- À exécuter dans Railway → MySQL → Query / Console
-- Après avoir exécuté ce script, le mot de passe sera : Master2025!

UPDATE users
SET password_hash = '$2b$10$sj9c.SQOzU7EuidvBzMNCO17WXGtUwIGPH3usbOn3ZYgDPVtua4Xa'
WHERE login = 'master@maaxbete.com';

-- Vérifier qu'une ligne a été mise à jour (optionnel)
SELECT id, login, role FROM users WHERE login = 'master@maaxbete.com';
