-- L'essai gratuit passe de 7 jours à un mois : chaque compte boutiquier existant
-- reçoit un mois d'essai à partir du déploiement. Une date de fin déjà plus lointaine est conservée.
UPDATE "User"
SET "trialEndsAt" = GREATEST("trialEndsAt", CURRENT_TIMESTAMP + INTERVAL '30 days')
WHERE "role" <> 'ADMIN';
