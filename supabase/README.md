# Supabase — Collab Créa

Projet : `qsbkwdtchhzclpxjrhnt`

- `migrations/20261009000000_initial_schema.sql` : schéma complet appliqué au projet (tables, fonctions, déclencheurs, RLS, stockage, données initiales).
- `lovable-migrations/` : historique d'origine de la version web (Lovable), conservé pour référence. Les tables `offers` et `applications` n'y étaient jamais créées ; elles ont été reconstituées (`20260206202143_base_offers_applications.sql`).

Après la mise en place :
1. Enregistrer la clé `service_role` dans le coffre pour les notifications push : `select vault_upsert_service_role_key('<clé service_role>');`
2. Le schéma `old_partial` (essai interrompu) peut être supprimé : `drop schema old_partial cascade;`
