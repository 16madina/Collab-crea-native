# Collab Créa — contexte du projet (à lire en premier)

Ce fichier transmet à tout agent / développeur ce qui a été décidé et construit.
Langue de l'app et de l'équipe : **français**. La propriétaire n'est pas développeuse :
explique simplement, fais les choses toi-même, et pousse sur GitHub après chaque changement validé.

## Le produit
Collab Créa met en relation **créateurs de contenu** et **marques** (Afrique francophone + diaspora).
Version store : 2.0.0 (Android versionCode > 6 ; identifiant com.collabcrea.app identique à l'app publiée).
Une marque publie une offre → les créateurs postulent → collaboration → paiement en séquestre →
livraison du contenu (aperçu filigrané avant paiement) → validation → le créateur est payé.
Un même compte peut avoir les deux espaces (créateur et marque) ; l'admin passe par le bouclier dans le profil.

- Ancienne version : app web Lovable (collabcrea.com, projet Lovable `10ffe8ef-2a67-4f9b-bb4a-3a8eec126aa0`).
  Sert de **référence fonctionnelle**. Le domaine collabcrea.com pointe encore dessus (ne pas le débrancher).
- Nouvelle version (ce dépôt) : app native **Expo** — dépôt GitHub `16madina/Collab-crea-native`, branche `main`.

## Pile technique
- Expo SDK 57 / React Native, **expo-router** (écrans dans `app/`), état global **zustand** (`src/store.ts`).
- Backend **Supabase**, projet `qsbkwdtchhzclpxjrhnt` (clé publiable dans `src/backend/supabase.ts`).
  - `src/backend/sync.ts` : charge les tables (RLS), pousse les changements locaux (diff), temps réel.
  - Opérations d'argent = fonctions SQL `SECURITY DEFINER` (pay_collaboration, approve_content,
    refund_collaboration, request_withdrawal, admin_finalize_withdrawal…), triggers de garde
    (`guard_collaboration`, `guard_profile`) — voir `supabase/migrations/`.
  - Fonctions Edge (`supabase/functions/`) : `send-push-notification`, `verify-social-screenshot`
    (analyse IA des captures réseaux sociaux avec Claude ; secret `ANTHROPIC_API_KEY` à ajouter dans Supabase).
- Mode « demo » (données fictives de `src/seed.ts`) seulement dans l'aperçu web ; sur téléphone = vraie base.

## Design
- Deux thèmes, **même mise en page** : sombre « Noir & Champagne » et clair « Champagne Rosé Premium ».
  Couleurs : `src/theme.ts` (`colors`, `LIGHT_COLORS`), `src/appearance.ts` (`PAL`), `src/lux.tsx` (dégradés or / or rose).
  Le thème est appliqué au démarrage (`src/Boot.tsx`, `index.js`) ; changer de mode recharge l'app et revient à l'accueil.
- Palette claire officielle : fond #FFF8F3, secondaire #F6E4D9, cartes #EFD0C0, or rose #C78970,
  cuivre #A65F46, reflets #FFE4CD, texte #30201C, texte secondaire #735E55.
- Animations douces (durée fixe, pas d'effet ressort).
- Accueil : en-tête photo + « Bonjour », grandes cartes « Nouvelles offres », créateurs populaires
  (vrais et fictifs alternés), petites cartes de catégories dans « Annonces populaires ».
- Grille tarifaire : `app/rates/[id].tsx` (une seule page, onglets Réseaux / Packages / Options à faire glisser),
  éditeur `app/edit/pricing.tsx` (catalogue, services, packages, options + % / + montant).

## Commandes
```bash
npm install          # première fois
npm start            # ouvre dans Expo Go (tunnel) — scanner le QR avec l'iPhone
npx tsc --noEmit     # vérification des types (à lancer avant chaque commit)
npx expo lint        # lint
```

## Fait
- App complète (offres, candidatures, collaborations, messagerie, portefeuille, admin, vérifications).
- Connexion email + Google + Apple ; CGU à cocher avant de continuer.
- Migration de l'ancienne base : 64 utilisateurs + profils, offres, collaborations, messages, etc.
  (les mots de passe ne sont pas copiés : les utilisateurs passent par « Mot de passe oublié » ou Google/Apple).
- Notifications push (code prêt), vérification réseaux sociaux par IA (clé à ajouter).
- Photos/vidéos publiques copiées de l'ancien stockage Lovable vers Supabase (89 fichiers : avatars, bannières,
  logos, images d'offres, portfolio, 4 vidéos de collaboration rangées en `storage://{créateur}/{collab}/…`).

## Reste à faire (par priorité)
1. **Fin de la copie des médias** — encore sur l'ancien stockage Lovable :
   - 20 fichiers privés (9 pièces d'identité, 8 selfies, 3 preuves de retrait) : illisibles sans la clé
     secrète de l'ancien projet (détenue par Lovable).
   - 1 vidéo de collaboration de 67 Mo (collab `d9f8c049…`) : dépasse la limite de 50 Mo par fichier de Supabase.
   - 2 fichiers du portfolio (créateur `cfc65298…`) déjà supprimés de l'ancien stockage : liens cassés, à retirer.
   - Ménage dans le tableau de bord Supabase : supprimer la fonction `migrate-media-tmp` (désactivée) et les
     4 anciennes copies `collaboration-content/{collab}/…` (doublons à la racine du bucket).
2. **Paiements réels** (FedaPay / Mobile Money ou Stripe) — aujourd'hui le séquestre est simulé.
3. **Notifications push** : `eas init`, `eas credentials` (clé APNs + Firebase), clé service dans le vault Supabase.
4. **Build installable** (EAS → TestFlight / APK), puis publication App Store / Google Play.
5. Migration finale des nouveaux inscrits de l'ancienne app + email « définir mon mot de passe ».
6. Site collabcrea.com (CGU, confidentialité, page sécurité des enfants, liens de téléchargement), puis bascule du domaine.
7. Avant lancement : retirer les profils/offres fictifs (`is_demo = true`) et les logs de debug (`src/debug.ts`).

## Règles
- Ne jamais mettre de clé secrète dans le code ni dans la conversation (seulement dans les réglages Supabase / EAS).
- Ne pas toucher au mode sombre quand on retouche le mode clair, et inversement, sauf demande.
- Ce projet est séparé de « WIPP » (autre app de la propriétaire) : ne pas les mélanger.
