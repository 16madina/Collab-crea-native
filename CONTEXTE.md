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
- Paiement réel Mobile Money via **FedaPay** (compte live) : fonctions `fedapay-collab-payment` (crée la
  transaction : page de paiement pour Wave, demande directe sur le téléphone pour MTN/Moov),
  `fedapay-collab-verify` (l'app vérifie pendant l'attente) et `fedapay-webhook` (webhook FedaPay #9252 vers
  ce projet), code commun dans `supabase/functions/_shared/fedapay.ts`. Le séquestre n'est validé que par
  `confirm_collab_payment` (réservée au serveur, contrôle du montant) ; `pay_collaboration` (paiement simulé)
  n'est plus appelable depuis l'app. Secrets Supabase : `FEDAPAY_SECRET_KEY`, `FEDAPAY_WEBHOOK_SECRET`.
  Déploiement : `supabase functions deploy <nom> --project-ref qsbkwdtchhzclpxjrhnt --use-api --no-verify-jwt`.
  Opérateurs proposés (`MOBILE_MONEY` dans `src/components/collab/PaymentSheet.tsx`) : Côte d'Ivoire Wave + MTN,
  Bénin MTN + Moov, Togo Moov. Dans l'aperçu web (mode demo), le paiement reste simulé.
- Paiement Mobile Money via **FeexPay** (boutique DeeDegital, identifiant `7CyXfoxfoauYi4X`) pour **Wave et Orange
  Côte d'Ivoire** : fonctions `feexpay-collab-payment` (renvoie le lien de paiement Wave / Orange Money),
  `feexpay-collab-verify` et `feexpay-webhook` (webhook FeexPay vers ce projet), code commun
  `supabase/functions/_shared/feexpay.ts`. Les webhooks FeexPay ne sont pas signés : le serveur relit toujours le
  statut chez FeexPay et contrôle le montant + la collaboration (`callback_info = collab:<id>`).
  Secrets Supabase : `FEEXPAY_API_KEY` (clé privée `fp_…`), `FEEXPAY_SHOP_ID`. Clé agrégée Wave activée le 16/10/2026.
  Liste d'IP autorisées FeexPay : l'ancienne IP Lovable (18.153.50.9) est **désactivée** — ne pas la réactiver ni
  ajouter d'IP fixe, les fonctions Supabase sortent par des adresses qui changent.
  Choix du prestataire par opérateur : `GATEWAY` dans `src/backend/payments.ts` (Wave + Orange → FeexPay,
  MTN + Moov → FedaPay). **Premier vrai paiement réussi le 16/10/2026** : Wave, 440 FCFA, collaboration
  `f4ec451b` (« pub the minceur »), passée en séquestre automatiquement.
- **Retraits des créateurs via FeexPay** : dans l'admin (Argent > Retraits), « Envoyer via FeexPay » (2 appuis pour
  confirmer) appelle `feexpay-payout`, qui verrouille la demande (`withdrawal_payout_start`), vire le montant net
  (−2 % de frais annoncés au créateur) sur `payouts/public/{wave_ci|orange_ci|mtn_ci|moov_ci}`, puis marque le
  retrait effectué (`withdrawal_payout_done`) ou refusé + solde recrédité (`withdrawal_payout_failed`). Sans réponse
  claire de FeexPay, le retrait reste « en cours » (pas de recrédit, pour ne jamais payer deux fois) : bouton
  « Vérifier le virement FeexPay » + `feexpay-webhook` (reconnaît le virement par sa référence). Migration
  `20261016000000_feexpay_payouts.sql`. Le virement part du **solde FeexPay** : il doit être suffisant.
- **Paiement par carte via Stripe Checkout** (compte Stripe « CollabCrea », live, solde en CAD) : fonctions
  `stripe-collab-payment` (page de paiement Stripe en EUR ou USD : montant FCFA +10 % +5 % converti au taux fixe
  655,957 / 600, identique à l'app), `stripe-collab-verify` et `stripe-webhook` (destination Stripe
  « collabcrea-native », événements checkout.session.completed / async_payment_succeeded, signature vérifiée).
  Code commun `supabase/functions/_shared/stripe.ts`. `confirm_collab_payment` accepte le total carte quand
  `p_method = 'card'` (migration `20261016020000_card_payments.sql`). Secrets : `STRIPE_SECRET_KEY` (clé standard
  « collabcrea-native » créée le 16/10), `STRIPE_WEBHOOK_SECRET`. La marque reçoit « ✅ Paiement confirmé »
  à chaque paiement (migration `20261016010000_brand_payment_notification.sql`).
- **Téléphone à l'inscription** : vérifié selon le pays de résidence (`src/phone.ts`, libphonenumber-js) puis
  enregistré au format international (+2250701234567) dans la table privée `profile_private` (lisible seulement
  par la personne et les admins, jamais dans le profil public). Rempli par `handle_new_user` depuis les
  métadonnées `phone` (migration `20261016040000_profile_phone.sql`).

## Reste à faire (par priorité)
1. **Fin de la copie des médias** — encore sur l'ancien stockage Lovable :
   - 20 fichiers privés (9 pièces d'identité, 8 selfies, 3 preuves de retrait) : illisibles sans la clé
     secrète de l'ancien projet (détenue par Lovable).
   - 1 vidéo de collaboration de 67 Mo (collab `d9f8c049…`) : dépasse la limite de 50 Mo par fichier de Supabase.
   - 2 fichiers du portfolio (créateur `cfc65298…`) déjà supprimés de l'ancien stockage : liens cassés, à retirer.
   - Ménage dans le tableau de bord Supabase : supprimer les 4 anciennes copies
     `collaboration-content/{collab}/…` (doublons à la racine du bucket).
2. **Paiements — suite** :
   - Tester un vrai paiement **Orange Money** Côte d'Ivoire (via FeexPay) et un paiement MTN (via FedaPay).
   - Vérifier la réception du webhook FeexPay (Supabase > Edge Functions > feexpay-webhook > Logs).
   - Wave échoue chez FedaPay (« transaction échouée ») : support FedaPay contacté le 15/10 (chat + courriel à
     support@fedapay.com depuis dinastar@hotmail.com), avec demande d'activation d'Orange Money et Wave Sénégal.
   - Carte bancaire (Stripe) : pas encore testée avec un vrai paiement (aucune collaboration à payer au 16/10).
     Pour les très petits montants, Stripe impose 0,50 € minimum : le montant facturé peut dépasser l'affichage.
   - Ancien webhook Stripe (vers l'ancien projet Lovable) encore actif : le supprimer après la bascule.
   - Retraits FeexPay : pas encore testés pour de vrai (portefeuille test à 360 FCFA < minimum de 1 000 FCFA, solde
     FeexPay trop faible). Vérifier que le « Payout API » est actif dans FeexPay. PayPal / virement bancaire restent
     manuels (« Finaliser manuellement », dont l'upload de preuve est encore factice).
   - Collaboration test `f4ec451b` : payée (440 FCFA réels) mais aucun contenu enregistré dans la nouvelle app ;
     le créateur doit livrer dans l'app avant que la marque puisse valider (crédit prévu : 360 FCFA, ancien barème 10 %).
   - L'ancien webhook FedaPay (vers l'ancien projet Lovable) est encore actif : le supprimer après la bascule.
3. **Notifications push** — configurées et **testées le 16/10** (build Release installé depuis Xcode sur l'iPhone, jeton
   enregistré, notification reçue « sent: 1 »). Reste : tester sur Android (build EAS preview) et en TestFlight :
   - Projet EAS `@missdee/collab-crea` (ID `5e5d3776-4c90-49bf-a1ab-af8a26e42ee5`, dans `app.json`).
   - Android : `google-services.json` (Firebase `collabcrea-a772a`) hors de GitHub, fourni aux builds par la variable
     EAS fichier `GOOGLE_SERVICES_JSON` (`app.config.js`) ; clé FCM V1 et keystore d'upload (alias `collabcrea`,
     PKCS12) enregistrés sur expo.dev > Credentials. Vérifier que l'empreinte SHA-1 du keystore (72:F8…23:6D)
     correspond à la « clé d'importation » dans la Play Console.
   - iOS : clé push APNs `6FD9WSWG5G` (équipe Apple `6XW2XM3NDF`) enregistrée via `eas credentials`.
   - Serveur : les déclencheurs SQL appellent `send-push-notification` avec le secret `push_trigger_secret` généré
     dans le vault (migration `20261016030000_push_trigger_secret.sql`) ; testé (réponse « No tokens found »).
   - Build iPhone local : `npx expo prebuild -p ios` puis Xcode (équipe Dee Digital, signature automatique) ou
     `npx expo run:ios --device "iPhone deena" --configuration Release` ; dossier `ios/` généré, hors GitHub.
   - Compte Apple : au build iPhone, saisir l'Apple ID et le mot de passe actuels (un ancien mot de passe enregistré
     dans le trousseau du Mac a provoqué un blocage temporaire le 16/10, résolu). Les notifications push ne marchent
     pas dans Expo Go : il faut un build EAS.
4. **Build installable** (EAS → TestFlight / APK), puis publication App Store / Google Play.
5. Migration finale des nouveaux inscrits de l'ancienne app + email « définir mon mot de passe ».
6. Site collabcrea.com (CGU, confidentialité, page sécurité des enfants, liens de téléchargement), puis bascule du domaine.
7. Avant lancement : retirer les profils/offres fictifs (`is_demo = true`) et les logs de debug (`src/debug.ts`).

## Règles
- Ne jamais mettre de clé secrète dans le code ni dans la conversation (seulement dans les réglages Supabase / EAS).
- Ne pas toucher au mode sombre quand on retouche le mode clair, et inversement, sauf demande.
- Ce projet est séparé de « WIPP » (autre app de la propriétaire) : ne pas les mélanger.
