-- Résultat des contrôles automatiques de la pièce d'identité, faits sur le téléphone au moment de la demande
-- (texte lu, bande MRZ et chiffres de contrôle, expiration, nom, visage sur la pièce). Indicatif pour l'admin.
alter table public.profiles add column if not exists identity_checks jsonb;
