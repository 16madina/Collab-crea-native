# Système de vérification d'identité — scan du visage + pièce d'identité

Cahier des charges technique complet, tiré de l'app **Collab Créa** (Expo / React Native + Supabase), à
reproduire dans une autre app (ex. **Cotise**). Il décrit le parcours, les écrans, les règles de détection,
la base de données, l'espace admin, les règles d'accès et les pièges rencontrés. Le code des parties
délicates est donné en entier en annexe.

> Versions utilisées : Expo SDK 57, React Native 0.86 (nouvelle architecture), React 19.2, expo-router,
> zustand, Supabase. Avant de coder, vérifier les versions de l'app cible (les API Expo changent à chaque SDK).

---

## 1. Vue d'ensemble

Objectif : un compte doit être **vérifié** (vraie personne + vraie pièce d'identité) avant les actions
sensibles. Dans Collab Créa : un créateur pour **postuler** à une offre, une marque pour **engager** un créateur.
Pour Cotise, adapter les actions protégées (ex. rejoindre / créer une cotisation, recevoir de l'argent, retirer).

Parcours complet :

1. **Inscription** (email + mot de passe, Google ou Apple) → la personne entre tout de suite dans l'app
   (confirmation d'email désactivée) et arrive sur **son profil**.
2. Un **bandeau « Vérifiez votre identité »** est visible sur l'accueil et sur le profil tant que le compte n'est
   pas vérifié. Bouton doré « Commencer ».
3. **Présentation** : 3 étapes (scan du visage, pièce d'identité, validation sous 24 h) + conseils.
4. **Scan du visage en direct** (caméra avant) : devant → gauche → droite → haut → bas. Chaque mouvement est
   réellement mesuré (angles de la tête). 3 photos sont prises automatiquement (face, gauche, droite).
5. **« Vérification du visage… »** : écran d'analyse animé (anneau, pourcentage, étapes cochées).
6. **Choix de la pièce** : carte d'identité, passeport, permis de conduire, carte de séjour.
7. **Photo de la pièce** dans l'app (caméra arrière) : cadre au format carte, recto puis verso
   (passeport : page photo seulement). Après chaque photo : « Reprendre » / « Valider ».
8. **« Analyse de la pièce… »** : contrôles automatiques sur le téléphone (texte lu, bande MRZ, chiffres de
   contrôle, expiration, nom, visage sur la pièce).
9. **Résultat des contrôles** : « Pièce reconnue » (vert) / « Contrôle incomplet » (orange : reprendre ou envoyer
   quand même) / « Pièce expirée » (rouge : envoi bloqué).
10. **« Vérification en cours… »** : envoi chiffré des photos → « Demande envoyée ».
11. **Écran « Vérification en cours »** (en attente) puis, après décision de l'admin, **« Identité vérifiée »** +
    notification. En cas de refus : motif envoyé, la personne peut recommencer.
12. **Admin › Identités** : file des demandes avec les 3 photos du visage, recto/verso de la pièce et les
    contrôles automatiques (✓ / ✗). Boutons « Approuver » (modèle de message) / « Refuser » (motif).

Tout l'habillage des écrans de caméra est **toujours sombre** (comme une caméra), quel que soit le thème.

---

## 2. Bibliothèques

| Rôle | Paquet | Remarque |
|---|---|---|
| Caméra | `react-native-vision-camera` 5.x | Nouvelle API v5 (« outputs »), dépend de Nitro |
| Dépendances de la caméra | `react-native-nitro-modules`, `react-native-nitro-image` | Obligatoires avec VisionCamera 5 |
| Détection du visage (en direct + sur photo) | `react-native-vision-camera-face-detector` 2.x | Google ML Kit, sur l'appareil |
| Lecture du texte (OCR) | `expo-text-extractor` 2.x | Apple Vision (iOS) / ML Kit (Android), sur l'appareil |
| Vibrations | `expo-haptics` | |
| Dégradés, dessins | `expo-linear-gradient`, `react-native-svg`, `react-native-reanimated` 4 | |
| Galerie (secours) | `expo-image-picker` | Son plugin fournit aussi le texte d'autorisation caméra iOS |

Installer avec `npx expo install …`. Ces modules ont du code natif : **il faut une nouvelle build**
(pas Expo Go). Tout est gratuit et fonctionne **hors ligne** : aucune image n'est envoyée à un service
extérieur pour l'analyse.

Autorisations (`app.json`) : VisionCamera 5 n'a pas de plugin Expo. Le texte iOS `NSCameraUsageDescription`
vient du plugin `expo-image-picker` (`cameraPermission`). Sur Android, l'autorisation CAMERA est ajoutée par ce
même plugin.

---

## 3. Structure des fichiers

```
app/verification/identity.tsx            Écran-chef d'orchestre (toutes les étapes)
src/components/verification/
  scanShared.tsx       Habillage du scan (cercle, graduations, ligne de scan, flèche, consignes)
  FaceScan.native.tsx  Scan réel : caméra avant + détection du visage + photos automatiques
  FaceScan.tsx         Version web (aperçu) : les étapes avancent toutes seules, pas de caméra
  Analysis.tsx         Écran « Vérification en cours… » (anneau, %, étapes cochées, tâche réelle)
  docShared.tsx        Habillage photo de pièce (cadre carte, coins dorés, déclencheur, Reprendre/Valider)
  DocCapture.native.tsx  Caméra arrière dans l'app
  DocCapture.tsx         Web : choix d'une image dans la galerie
  docChecks.native.ts  Contrôles automatiques de la pièce (OCR, MRZ, expiration, nom, visage)
  docChecks.ts         Web : contrôles indisponibles
  checkRows.ts         Mise en forme des contrôles + verdict (pour la personne et l'admin)
src/mrz.ts             Lecture de la bande MRZ + chiffres de contrôle (norme OACI 9303)
src/components/admin/Review.tsx   Admin › Identités
src/components/account/widgets.tsx  Bandeau « Vérifiez votre identité » + état de vérification
```

Les fichiers `.native.tsx` / `.tsx` permettent à l'aperçu web de fonctionner sans les modules natifs
(Metro choisit automatiquement le bon fichier selon la plateforme).

---

## 4. Scan du visage (le cœur)

### 4.1 Écran

- Fond noir, caméra avant plein écran, **masque sombre** (`rgba(5,5,5,0.86)`) avec un **trou rond** au centre
  (SVG `Path` en `fillRule="evenodd"` : rectangle plein écran + cercle).
- Diamètre du cercle : `min(largeur × 0.74, 300, hauteur × 0.4)`, centre à `haut sécurisé + 112 + rayon`.
- **72 graduations** autour du cercle (traits SVG de `rayon+10` à `rayon+24`), réparties en 4 côtés :
  haut (315°–45°), droite, bas, gauche. Couleurs :
  - avant le centrage : blanc 16 % ; après : blanc 32 % ; côté à faire : blanc 75 % ;
  - quand une direction est validée, ses 18 graduations **s'allument une à une en doré** (`#D8AD6A`,
    une toutes les 22 ms) ; à la fin, **toutes passent au vert** (`#4CC38A`).
- **Ligne de scan** : bande dégradée dorée (60 px, transparent → doré 38 %) + trait doré lumineux de 2 px, qui
  balaie le cercle de haut en bas en continu (1,9 s, aller-retour). C'est le « on sent le scan passer ».
- **Bord du cercle** : doré quand le visage est bien placé, blanc 18 % sinon, vert à la fin.
- **Flèche** dorée à l'extérieur du cercle, du côté à suivre, qui pulse (±10 px, 520 ms).
- En-tête : bouton fermer (X), « Scan du visage », compteur « 2/5 ».
- Sous le cercle : la **consigne** en grand (24 px, gras) et, si besoin, une **pastille d'aide** dorée
  (« Rapprochez-vous un peu », « Une seule personne dans le cadre »…). En bas : 5 points d'étape.
- Fin : rond vert avec coche au centre, « Scan terminé — Votre visage a bien été enregistré. », vibration
  « succès », puis passage automatique à l'écran suivant après 1,3 s.

### 4.2 Les 5 consignes et leur détection

Les visages détectés arrivent plusieurs fois par seconde avec `yawAngle` (tête tournée gauche/droite),
`pitchAngle` (tête levée/baissée), `bounds` et la taille de l'image.

| Étape | Condition (angles en degrés) | Tenue |
|---|---|---|
| Regardez droit devant | \|yaw\| < 10 et \|pitch\| < 10 | 700 ms |
| Tournez la tête à gauche | \|yaw\| > 24 et \|pitch\| < 22 | 250 ms |
| Tournez la tête à droite | \|yaw\| > 24, **signe opposé** au côté précédent, \|pitch\| < 22 | 250 ms |
| Levez la tête | \|pitch\| > 14 et \|yaw\| < 22 | 250 ms |
| Baissez la tête | \|pitch\| > 14, **signe opposé** au précédent, \|yaw\| < 22 | 250 ms |

- **Signe opposé** : le signe des angles dépend de l'appareil et de l'effet miroir. Au lieu de deviner, on
  retient le signe du premier côté validé et on exige le signe contraire pour le second : les deux profils
  sont donc forcément vus.
- **Contrôles avant chaque mesure** : aucun visage → « Placez votre visage dans le cercle » ; plusieurs →
  « Une seule personne dans le cadre » ; visage trop petit (taille < 28 % de l'image) → « Rapprochez-vous un
  peu » ; trop grand (> 95 %) → « Éloignez-vous un peu ».
- Si une étape dure plus de 7 s : « Tournez un peu plus la tête » / « Inclinez un peu plus la tête » /
  « Regardez bien l'écran, tête droite ».
- Chaque étape validée : vibration moyenne. **Photos automatiques** (JPEG, 768×1024, sans bruit) aux étapes
  devant, gauche et droite.
- Détection en mode `accurate` (les angles haut/bas sont plus fiables qu'en mode `fast`).

Ce scan prouve qu'une **vraie personne** est devant la caméra (une photo imprimée ou un écran ne tourne pas la
tête dans les deux sens). La **comparaison visage ↔ photo de la pièce** est faite par l'admin.

### 4.3 Points techniques importants

- Les sorties caméra (détection + photo) doivent être **créées une seule fois**. Le hook
  `useFaceDetectorOutput` du paquet recrée la sortie à chaque rendu (bug : dépendance sur un objet recréé),
  ce qui reconfigure la caméra en boucle. Solution retenue : une fonction `createScan()` **hors de React**,
  appelée une fois via `useState(() => createScan(...))`, qui crée `createFaceDetectorOutput(...)` et
  `VisionCamera.createPhotoOutput(...)` et garde l'état du scan dans un simple objet. React ne reçoit que
  les changements d'affichage (étape, aide, visage vu, photos). Cela respecte aussi les règles du
  compilateur React (pas de `Date.now()` ni de ref lus pendant le rendu).
- `<Camera device="front" isActive outputs={[scan.face, scan.photo]} resizeMode="cover" />`.
- Autorisation caméra : `useCameraPermission()` ; si refusée, écran « Accès à la caméra » + bouton
  « Ouvrir les réglages » (`Linking.openSettings()`).
- La détection de visage ML Kit **ne marche pas sur le simulateur iOS 26** : tester sur un vrai téléphone.

---

## 5. Écran d'analyse « Vérification en cours… »

Composant réutilisé 3 fois (visage, analyse de la pièce, envoi). Fond `#0B0B0B` :
- anneau de progression (rayon 72) doré qui se remplit, avec un **arc lumineux qui tourne** autour
  (dégradé doré, 1,4 s par tour) et au centre un bouclier + **pourcentage** qui monte ;
- liste d'étapes : rond vide → **roue qui tourne** (étape en cours) → **coche verte** ; une étape toutes les
  1,1 s, et **la dernière attend la fin de la vraie tâche** (envoi des fichiers, contrôles…) ;
- à la fin : grand rond vert avec coche et le titre final (« Visage validé », « Analyse terminée »,
  « Demande envoyée »), puis l'écran suivant après 1,4 s ;
- en bas : « 🔒 Données chiffrées · visibles seulement par l'équipe de vérification ».
- Si la tâche échoue : message d'erreur et retour à l'étape précédente.

Textes des étapes :
- Visage : « Analyse des points du visage », « Détection de présence réelle », « Contrôle de la netteté des photos ».
- Pièce : « Lecture du texte de la pièce », « Lecture de la bande de sécurité (MRZ) », « Contrôle des chiffres de sécurité », « Recherche du visage sur la pièce ».
- Envoi : « Chiffrement des photos », « Envoi sécurisé des fichiers », « Contrôle de la qualité du document », « Transmission à l'équipe de vérification ».

---

## 6. Photo de la pièce

- Caméra arrière plein écran, masque sombre avec un **trou rectangle arrondi** (rayon 18) au **format carte**
  (largeur écran − 40, ratio 1,586 ; passeport 1,42), **4 coins dorés** en L, ligne de scan horizontale qui balaie.
- Titre : « Recto : carte d'identité » / « Verso : … » / « Page photo du passeport » ; sous-titre ; conseils
  (bonne lumière sans reflet, 4 coins visibles, texte net) ; compteur « 1/2 ».
- Bas : grand **déclencheur** blanc (76 px) + bouton **Galerie** (secours). Photo JPEG 1440×1920.
- Après la photo : elle s'affiche dans le cadre, « La photo est-elle lisible ? », boutons **Reprendre** /
  **Valider**.
- Pièces proposées : Carte d'identité (recto + verso), Passeport (page photo), Permis de conduire (recto + verso),
  Carte de séjour (recto + verso).

---

## 7. Contrôles automatiques de la pièce (gratuits, sur le téléphone)

Faits sur toutes les photos de la pièce (recto + verso) :

1. **Texte lisible** : OCR (`extractTextFromImage`), au moins 20 caractères.
2. **Bande MRZ** : recherche des 2 ou 3 lignes avec des « < » (passeport : TD3, 2 × 44 ; cartes : TD1, 3 × 30,
   ou TD2, 2 × 36). Tolère les erreurs de lecture (espaces, « « » lu à la place de « << », O/0, I/1, S/5, B/8…).
3. **Chiffres de contrôle** (norme OACI 9303 : poids 7-3-1, modulo 10) sur le numéro, la date de naissance,
   la date d'expiration et le contrôle global. Résultat « 4/4 ». Une pièce inventée ou mal modifiée échoue
   presque toujours ici.
4. **Expiration** : date lue dans la MRZ. Pièce expirée = **envoi bloqué**.
5. **Nom** : les mots du nom du profil (sans accents, en majuscules) doivent se retrouver sur la pièce (MRZ ou
   texte imprimé) ; au moins 2 mots (ou 1 si le nom n'a qu'un mot).
6. **Visage sur la pièce** : détection de visage sur la photo (`createImageFaceDetector`, taille mini 5 %).

Présentation (`checkRows`) — chaque ligne : ✓ vert, ✗ rouge ou ⊖ gris (non applicable) :
« Visage présent sur la pièce », « Texte de la pièce lisible », « Bande de sécurité (MRZ) lue » (obligatoire
pour un passeport ; gris « Non trouvée sur ce document » pour les autres), « Chiffres de sécurité valides — 4/4 »,
« Pièce en cours de validité — Expire le 12/05/2031 », « Nom identique au profil — ANNA ERIKSSON ».

Verdict (`checkVerdict`) :
- **fail** si la pièce est expirée → écran rouge « Pièce expirée », seul bouton « Choisir une autre pièce » ;
- **ok** si aucun ✗ et visage + nom confirmés → écran vert « Pièce reconnue » + « Envoyer ma demande » ;
- **warn** sinon → écran orange « Contrôle incomplet » + « Reprendre les photos » / « Envoyer quand même ».

Limites (à dire honnêtement) : ces contrôles écartent les fausses pièces grossières, les photos d'autre chose,
les pièces expirées et les noms différents, mais **pas une contrefaçon soignée**. L'admin garde la décision.
Niveau supérieur possible : lecture de la **puce NFC** des passeports biométriques (signature de l'État), ou un
service spécialisé payant (ex. **Smile ID**, spécialiste de l'Afrique : comparaison automatique visage / pièce,
vérification auprès des bases officielles selon les pays).

Testé sur les spécimens officiels OACI (passeport TD3, cartes TD1 et TD2, version « mal lue », faux chiffre) :
lecture correcte et faux chiffre détecté (2/4).

---

## 8. Base de données et stockage (Supabase)

Colonnes de `profiles` :

| Colonne | Type | Rôle |
|---|---|---|
| `email_verified` | boolean | Email confirmé (mis à jour par déclencheur) |
| `identity_verified` | boolean | **Identité validée par un admin** (le seul qui compte pour les accès) |
| `identity_submitted_at` | timestamptz | Date de la demande (non nul = en attente) |
| `identity_method` | text | `face_scan` (scan + pièce) ; anciens : `document`, `selfie` |
| `selfie_url` | text | Chemin de la 1re photo du visage (le dossier contient les 3) |
| `identity_document_url` | text | Chemin du recto (le dossier contient recto + verso) |
| `identity_checks` | jsonb | Résultat des contrôles automatiques (voir type ci-dessous) |

```sql
alter table public.profiles add column if not exists identity_checks jsonb;
```

Type `IdentityChecks` : `doc_type`, `available` (false sur le web), `checked_at`, `text_found`, `mrz_found`,
`mrz_valid`, `mrz_checks` (« 4/4 »), `doc_number`, `country`, `doc_name`, `expiry` (AAAA-MM-JJ), `expired`,
`name_match`, `face_on_doc`.

Stockage : 2 buckets **privés**, `selfies` et `identity-documents`. Chemins :
`{user_id}/identity/{horodatage}/face.jpg | left.jpg | right.jpg` et
`{user_id}/identity/{horodatage}/recto-{type}.jpg | verso-{type}.jpg`.
Règles (RLS storage) : chacun peut déposer et lire **uniquement dans son dossier**
(`auth.uid()::text = (storage.foldername(name))[1]`) ; les **admins** lisent tout (`has_role(auth.uid(),'admin')`).
L'admin affiche les images via des **liens signés temporaires** (10 min).

**Sécurité indispensable** : un déclencheur `guard_profile` (BEFORE INSERT/UPDATE sur `profiles`) interdit à un
utilisateur de modifier lui-même `identity_verified`, `email_verified`, `is_banned`, `rating` (« Modification non
autorisée ») ; seuls un admin ou le serveur le peuvent. Sans ça, n'importe qui pourrait se déclarer vérifié.
`identity_checks` est rempli par le téléphone : il est **indicatif** (aide à la décision), pas une preuve.

Email : déclencheur `on_auth_user_email_confirmed` (après mise à jour de `email_confirmed_at`) → `email_verified =
true` ; et à l'inscription, `handle_new_user` met `email_verified = (email_confirmed_at is not null)`.
« Confirm email » est **désactivé** dans Supabase (Authentication › Sign In / Providers) : les nouveaux comptes
entrent tout de suite et leur email est marqué vérifié automatiquement.

Numéro de téléphone (fait en même temps) : vérifié selon le pays de résidence avec `libphonenumber-js`, enregistré
au format international (+225…) dans une table privée `profile_private` (lisible par la personne et les admins).

---

## 9. Règles d'accès

- **Actions protégées** : refusées tant que `identity_verified` est faux, avec le message « Vérifiez votre
  identité pour … » et **redirection directe** vers l'écran de vérification.
  Collab Créa : créateur → postuler (aussi bloqué côté base par RLS) ; marque → proposer une offre / accepter une
  proposition (engager) ; retrait d'argent → identité vérifiée exigée côté base.
- **État affiché** (`verifState`) : identité vérifiée + email vérifié = « Vérifié » ; demande envoyée = « En
  attente » ; sinon « Identité non vérifiée » (bandeau « Vérifiez votre identité — Requis pour … Environ 2 minutes. »).
- Après l'inscription (email, Google, Apple ou lien de confirmation), un **nouveau compte** (créé il y a moins de
  10 min) arrive sur **son profil** ; un compte existant sur l'accueil.

---

## 10. Espace admin (Admin › Identités)

- File des demandes (`identity_submitted_at` non nul et `identity_verified` faux), la plus ancienne d'abord.
- Pour chaque demande : avatar, nom, date, badge « Scan + pièce », **3 photos du visage**, **recto/verso**, puis
  les **contrôles automatiques** (✓/✗ + n° de pièce + pays).
- « Approuver » (avec un modèle de message) → `identity_verified = true` + notification « Identité vérifiée ✅ ».
- « Refuser » (avec un motif) → efface la demande (`identity_submitted_at`, `identity_method`, `identity_checks`)
  + notification « Vérification refusée — Motif : … » ; la personne peut recommencer.

---

## 11. Aperçu web

Pas de caméra ni de détection dans le navigateur : le scan avance tout seul (silhouette dans le cercle, pastille
« Aperçu : sur téléphone, la caméra suit vraiment vos mouvements »), la pièce se choisit dans la galerie, les
contrôles sont sautés, et **rien n'est envoyé** si le compte est réel (message « la vraie vérification se fait
depuis l'app sur téléphone »).

---

## 12. Pièges rencontrés

1. VisionCamera 5 : nouvelle API (`outputs`, `usePhotoOutput`, `capturePhotoToFile` → `filePath` sans
   `file://`, à ajouter). Pas de plugin Expo : autorisations via `expo-image-picker`.
2. Créer les sorties caméra une seule fois (voir 4.3), sinon la caméra se reconfigure sans arrêt.
3. Détection de visage ML Kit : pas sur simulateur iOS 26, tester sur vrai téléphone.
4. Signe des angles variable selon l'appareil : utiliser la logique « signe opposé ».
5. Compilateur React / lint : pas de `Date.now()`, de ref lue ou de `setState` synchrone pendant le rendu ou dans
   un effet ; d'où la logique hors de React.
6. Bouton blanc sur fond blanc en mode sombre : le bouton « Commencer » du bandeau doit être doré avec texte foncé
   (`colors.primary` / `colors.onPrimary`).
7. Installation sur iPhone : `npx expo run:ios --configuration Release` bloque parfois à « Connecting to … » ;
   installer alors directement avec `xcrun devicectl device install app --device <id> <chemin .app>`.
8. Le Hermes du bundle stocke les textes accentués autrement : pour vérifier qu'une build contient le nouveau
   code, chercher un texte sans accent.

---

## Annexes — code des parties délicates

### A. Lecture MRZ et chiffres de contrôle — `src/mrz.ts`

```ts
// Lecture de la bande « MRZ » des pièces d'identité (les 2 ou 3 lignes avec des « < » en bas des
// passeports et au dos des cartes) à partir du texte lu sur la photo, et contrôle de ses chiffres de
// sécurité (norme OACI 9303 : passeports TD3, cartes TD1 et TD2). Tolère les erreurs de lecture courantes.

export type Mrz = {
  format: "TD1" | "TD2" | "TD3";
  docType: string;
  country: string;
  docNumber: string;
  surname: string;
  givenNames: string;
  birth: string; // AAMMJJ
  expiry: string; // AAMMJJ
  checksOk: boolean; // tous les chiffres de contrôle sont bons
  checksPassed: number;
  checksTotal: number;
};

const LEN = { TD1: 30, TD2: 36, TD3: 44 } as const;

function charValue(c: string) {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55;
  return 0; // « < »
}

/** Chiffre de contrôle OACI : poids 7, 3, 1 répétés, somme modulo 10. */
export function checkDigit(s: string) {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += charValue(s[i]) * w[i % 3];
  return String(sum % 10);
}

/** Corrige les confusions lettre / chiffre dans une zone qui ne contient que des chiffres. */
const digits = (s: string) => s.replace(/O|Q|D/g, "0").replace(/I|L/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/B/g, "8").replace(/G/g, "6");

/** Nettoie une ligne lue : majuscules, sans espaces, guillemets « pris pour des < ». */
function clean(line: string) {
  return line
    .toUpperCase()
    .replace(/«/g, "<<")
    .replace(/[‹〈＜]/g, "<")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

const fit = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + "<".repeat(n - s.length));

function names(s: string) {
  const [sur, ...rest] = s.replace(/<+$/, "").split("<<");
  return { surname: sur.replace(/</g, " ").trim(), givenNames: rest.join(" ").replace(/</g, " ").replace(/\s+/g, " ").trim() };
}

function verify(pairs: [string, string][]) {
  const passed = pairs.filter(([data, chk]) => checkDigit(data) === chk).length;
  return { checksPassed: passed, checksTotal: pairs.length, checksOk: passed === pairs.length };
}

function parseTD3(l1: string, l2: string): Mrz {
  l1 = fit(l1, 44);
  l2 = fit(l2, 44);
  const num = l2.slice(0, 9);
  const birth = digits(l2.slice(13, 19));
  const expiry = digits(l2.slice(21, 27));
  const c = (i: number) => digits(l2[i]);
  const opt = l2.slice(28, 42);
  const composite = num + c(9) + birth + c(19) + expiry + c(27) + opt + c(42);
  return {
    format: "TD3",
    docType: l1.slice(0, 2).replace(/</g, ""),
    country: l1.slice(2, 5).replace(/</g, ""),
    docNumber: num.replace(/</g, ""),
    ...names(l1.slice(5)),
    birth,
    expiry,
    ...verify([
      [num, c(9)],
      [birth, c(19)],
      [expiry, c(27)],
      [composite, c(43)],
    ]),
  };
}

function parseTD1(l1: string, l2: string, l3: string): Mrz {
  l1 = fit(l1, 30);
  l2 = fit(l2, 30);
  l3 = fit(l3, 30);
  const num = l1.slice(5, 14);
  const birth = digits(l2.slice(0, 6));
  const expiry = digits(l2.slice(8, 14));
  const composite = l1.slice(5, 30) + birth + digits(l2[6]) + expiry + digits(l2[14]) + l2.slice(18, 29);
  return {
    format: "TD1",
    docType: l1.slice(0, 2).replace(/</g, ""),
    country: l1.slice(2, 5).replace(/</g, ""),
    docNumber: num.replace(/</g, ""),
    ...names(l3),
    birth,
    expiry,
    ...verify([
      [num, digits(l1[14])],
      [birth, digits(l2[6])],
      [expiry, digits(l2[14])],
      [composite, digits(l2[29])],
    ]),
  };
}

function parseTD2(l1: string, l2: string): Mrz {
  l1 = fit(l1, 36);
  l2 = fit(l2, 36);
  const num = l2.slice(0, 9);
  const birth = digits(l2.slice(13, 19));
  const expiry = digits(l2.slice(21, 27));
  const c = (i: number) => digits(l2[i]);
  const composite = num + c(9) + birth + c(19) + expiry + c(27) + l2.slice(28, 35);
  return {
    format: "TD2",
    docType: l1.slice(0, 2).replace(/</g, ""),
    country: l1.slice(2, 5).replace(/</g, ""),
    docNumber: num.replace(/</g, ""),
    ...names(l1.slice(5)),
    birth,
    expiry,
    ...verify([
      [num, c(9)],
      [birth, c(19)],
      [expiry, c(27)],
      [composite, c(35)],
    ]),
  };
}

/** Cherche une bande MRZ dans les lignes de texte lues sur une ou plusieurs photos. */
export function findMrz(lines: string[]): Mrz | null {
  // Lignes candidates : assez longues et contenant des « < ».
  const cand = lines
    .flatMap((l) => l.split(/\n/))
    .map(clean)
    .filter((l) => l.length >= 26 && l.includes("<"));
  const best: Mrz[] = [];
  for (let i = 0; i < cand.length; i++) {
    const a = cand[i];
    const b = cand[i + 1];
    const c = cand[i + 2];
    if (b && a.length >= 40 && b.length >= 40 && /^[PV]/.test(a)) best.push(parseTD3(a, b));
    if (b && c && a.length <= 33 && b.length <= 33 && c.length <= 33 && /^[ACI]/.test(a)) best.push(parseTD1(a, b, c));
    if (b && a.length > 33 && a.length < 40 && /^[ACIPV]/.test(a)) best.push(parseTD2(a, b));
  }
  if (!best.length) return null;
  // Garde la lecture la plus cohérente (le plus de chiffres de contrôle justes).
  return best.sort((x, y) => y.checksPassed - x.checksPassed)[0];
}

/** Date AAMMJJ d'expiration → Date (les années 00–79 sont 2000–2079). */
export function mrzDate(yymmdd: string, future = true): Date | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const year = future ? 2000 + yy : yy > new Date().getFullYear() % 100 ? 1900 + yy : 2000 + yy;
  const d = new Date(Date.UTC(year, Number(yymmdd.slice(2, 4)) - 1, Number(yymmdd.slice(4, 6))));
  return isNaN(d.getTime()) ? null : d;
}

/** Mots du nom, en majuscules sans accents (pour comparer pièce et profil). */
export function nameWords(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((w) => w.length >= 2);
}

export const MRZ_LEN = LEN;
```

### B. Scan du visage (téléphone) — `src/components/verification/FaceScan.native.tsx`

```tsx
// Scan du visage sur téléphone : caméra avant + détection du visage (Google ML Kit, sur l'appareil).
// La personne suit 5 consignes (devant, gauche, droite, haut, bas) ; chaque mouvement est réellement
// mesuré (angles de la tête), et 3 photos sont prises automatiquement (face, gauche, droite).
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Camera, CommonResolutions, useCameraPermission, VisionCamera } from "react-native-vision-camera";
import { createFaceDetectorOutput, type Face } from "react-native-vision-camera-face-detector";
import type { Picked } from "../../backend/upload";
import { Button } from "../../ui";
import { SCAN_STEPS, ScanOverlay, type ScanStep } from "./scanShared";

const PHOTO_STEPS: ScanStep[] = ["center", "left", "right"];
const TURN = 24; // degrés pour gauche / droite
const TILT = 14; // degrés pour haut / bas

export function FaceScan({ onDone, onCancel }: { onDone: (photos: Picked[]) => void; onCancel: () => void }) {
  const permission = useCameraPermission();
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!permission.hasPermission && permission.canRequestPermission) void permission.requestPermission().finally(() => setAsked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!permission.hasPermission)
    return (
      <View style={[StyleSheet.absoluteFill, st.center]}>
        {asked || !permission.canRequestPermission ? (
          <>
            <Text style={st.title}>Accès à la caméra</Text>
            <Text style={st.sub}>Autorisez la caméra dans les réglages du téléphone pour scanner votre visage.</Text>
            <Button label="Ouvrir les réglages" icon="settings-outline" onPress={() => void Linking.openSettings()} />
            <Button label="Annuler" variant="ghost" icon={null} onPress={onCancel} />
          </>
        ) : null}
      </View>
    );
  return <Scanner onDone={onDone} onCancel={onCancel} />;
}

type ScanUI = {
  setStep: (n: number) => void;
  setDone: (f: (d: ScanStep[]) => ScanStep[]) => void;
  setHint: (h: string | null) => void;
  setFaceSeen: (v: boolean) => void;
  setPhotos: (p: Picked[]) => void;
};

/**
 * Suivi du scan, hors rendu React : reçoit les visages détectés (plusieurs fois par seconde),
 * vérifie la consigne en cours et prend les photos. Les sorties caméra (visage + photo) sont créées ici.
 */
function createScan(ui: ScanUI) {
  const photo = VisionCamera.createPhotoOutput({
    targetResolution: CommonResolutions.HD_4_3,
    containerFormat: "jpeg",
    quality: 0.85,
    qualityPrioritization: "balanced",
    previewImageTargetSize: undefined,
  });
  const c = { step: 0, stepStart: Date.now(), hold: 0, signH: 0, signV: 0, over: false, hint: "" as string | null, seen: false };
  const shots: Promise<Picked | null>[] = [];

  const say = (h: string | null) => {
    if (c.hint !== h) {
      c.hint = h;
      ui.setHint(h);
    }
  };
  const seen = (v: boolean) => {
    if (c.seen !== v) {
      c.seen = v;
      ui.setFaceSeen(v);
    }
  };
  const capture = (key: ScanStep) =>
    photo
      .capturePhotoToFile({ enableShutterSound: false }, {})
      .then((f): Picked => ({ uri: f.filePath.startsWith("file://") ? f.filePath : `file://${f.filePath}`, mime: "image/jpeg", name: `${key}.jpg`, kind: "image" }))
      .catch(() => null);

  const complete = (key: ScanStep) => {
    if (PHOTO_STEPS.includes(key)) shots.push(capture(key));
    c.step += 1;
    c.stepStart = Date.now();
    c.hold = 0;
    ui.setDone((d) => [...d, key]);
    say(null);
    if (c.step >= SCAN_STEPS.length) {
      c.over = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void Promise.all(shots).then((list) => ui.setPhotos(list.filter((p): p is Picked => !!p)));
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    ui.setStep(c.step);
  };

  const onFaces = (faces: Face[]) => {
    if (c.over) return;
    const now = Date.now();
    const lost = (h: string) => {
      c.hold = 0;
      seen(false);
      say(h);
    };
    if (faces.length === 0) return lost("Placez votre visage dans le cercle");
    if (faces.length > 1) return lost("Une seule personne dans le cadre");
    const f = faces[0];
    const size = Math.max(f.bounds.width, f.bounds.height) / Math.min(f.frameWidth, f.frameHeight);
    if (size < 0.28) return lost("Rapprochez-vous un peu");
    if (size > 0.95) return lost("Éloignez-vous un peu");
    seen(true);
    const yaw = f.yawAngle;
    const pitch = f.pitchAngle;
    const key = SCAN_STEPS[c.step].key;
    let ok = false;
    let sign = 0;
    if (key === "center") ok = Math.abs(yaw) < 10 && Math.abs(pitch) < 10;
    else if (key === "left" || key === "right") {
      sign = Math.sign(yaw);
      // Le 2e côté doit être l'opposé du 1er : les deux profils sont bien vus.
      ok = Math.abs(yaw) > TURN && Math.abs(pitch) < 22 && (c.signH === 0 || sign === -c.signH);
    } else {
      sign = Math.sign(pitch);
      ok = Math.abs(pitch) > TILT && Math.abs(yaw) < 22 && (c.signV === 0 || sign === -c.signV);
    }
    if (!ok) {
      c.hold = 0;
      const slow = now - c.stepStart > 7000;
      return say(!slow ? null : key === "center" ? "Regardez bien l'écran, tête droite" : key === "up" || key === "down" ? "Inclinez un peu plus la tête" : "Tournez un peu plus la tête");
    }
    say(null);
    if (!c.hold) c.hold = now;
    if (now - c.hold < (key === "center" ? 700 : 250)) return;
    if (key === "left" || key === "right") c.signH = c.signH || sign;
    if (key === "up" || key === "down") c.signV = c.signV || sign;
    complete(key);
  };

  const face = createFaceDetectorOutput({ performanceMode: "accurate", cameraFacing: "front", onFacesDetected: onFaces, onError: () => {} });
  return { face, photo };
}

function Scanner({ onDone, onCancel }: { onDone: (photos: Picked[]) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<ScanStep[]>([]);
  const [hint, setHint] = useState<string | null>("Placez votre visage dans le cercle");
  const [faceSeen, setFaceSeen] = useState(false);
  const [photos, setPhotos] = useState<Picked[] | null>(null);
  const [scan] = useState(() => createScan({ setStep, setDone, setHint, setFaceSeen, setPhotos }));
  const finished = step >= SCAN_STEPS.length;

  // Laisse le temps de voir « Scan terminé » avant de passer à la suite.
  useEffect(() => {
    if (!photos) return;
    const t = setTimeout(() => onDone(photos), 1300);
    return () => clearTimeout(t);
  }, [photos, onDone]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
      <Camera style={StyleSheet.absoluteFill} device="front" isActive outputs={[scan.face, scan.photo]} resizeMode="cover" />
      <ScanOverlay step={step} done={done} hint={hint} finished={finished} faceSeen={faceSeen} onClose={onCancel} />
    </View>
  );
}

const st = StyleSheet.create({
  center: { backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  sub: { color: "rgba(255,255,255,0.65)", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
```

### C. Habillage du scan — `src/components/verification/scanShared.tsx`

```tsx
// Habillage commun du scan du visage (téléphone et aperçu web) : cercle, graduations qui s'allument
// direction par direction (comme Face ID), ligne de scan qui balaie le visage, consignes.
// Toujours sombre, comme une caméra, quel que soit le thème de l'app.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Path } from "react-native-svg";
import { Press } from "../../ui";

export const GOLD = "#D8AD6A";
export const GREEN = "#4CC38A";

export type ScanStep = "center" | "left" | "right" | "up" | "down";
export const SCAN_STEPS: { key: ScanStep; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "center", title: "Regardez droit devant", icon: "scan-outline" },
  { key: "left", title: "Tournez la tête à gauche", icon: "arrow-back" },
  { key: "right", title: "Tournez la tête à droite", icon: "arrow-forward" },
  { key: "up", title: "Levez la tête", icon: "arrow-up" },
  { key: "down", title: "Baissez la tête", icon: "arrow-down" },
];

const TICKS = 72; // graduations autour du cercle
const PER_SIDE = TICKS / 4;

/** Côté du cercle d'une graduation (0 = en haut, sens des aiguilles d'une montre). */
function sideOf(i: number): ScanStep {
  const deg = (i / TICKS) * 360;
  if (deg >= 315 || deg < 45) return "up";
  if (deg < 135) return "right";
  if (deg < 225) return "down";
  return "left";
}

/** Nombre de graduations allumées par côté : elles s'allument une à une quand une direction est validée. */
function useLitTicks(done: ScanStep[]) {
  const [lit, setLit] = useState<Record<string, number>>({});
  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);
  useEffect(() => {
    const t = setInterval(() => {
      setLit((cur) => {
        let changed = false;
        const next = { ...cur };
        for (const s of doneRef.current) {
          if (s === "center") continue;
          if ((next[s] ?? 0) < PER_SIDE) {
            next[s] = (next[s] ?? 0) + 1;
            changed = true;
          }
        }
        return changed ? next : cur;
      });
    }, 22);
    return () => clearInterval(t);
  }, []);
  return lit;
}

export function useScanLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const D = Math.min(width * 0.74, 300, height * 0.4);
  const cx = width / 2;
  const cy = insets.top + 112 + D / 2;
  return { width, height, D, cx, cy, insets };
}

export function ScanOverlay({
  step,
  done,
  hint,
  finished,
  faceSeen,
  inside,
  onClose,
}: {
  step: number;
  done: ScanStep[];
  hint: string | null;
  finished: boolean;
  faceSeen: boolean;
  inside?: ReactNode;
  onClose: () => void;
}) {
  const { width, height, D, cx, cy, insets } = useScanLayout();
  const R = D / 2;
  const lit = useLitTicks(done);
  const cur = SCAN_STEPS[Math.min(step, SCAN_STEPS.length - 1)];
  const ready = done.includes("center");

  // Ligne de scan qui balaie le visage de haut en bas, en continu.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -60 + sweep.value * (D + 20) }] }));

  // Flèche qui indique la direction à suivre.
  const nudge = useSharedValue(0);
  useEffect(() => {
    nudge.value = 0;
    nudge.value = withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })), -1);
  }, [step, nudge]);
  const dir = cur.key;
  const arrowStyle = useAnimatedStyle(() => {
    const d = nudge.value * 10;
    return {
      opacity: 0.55 + nudge.value * 0.45,
      transform: [{ translateX: dir === "left" ? -d : dir === "right" ? d : 0 }, { translateY: dir === "up" ? -d : dir === "down" ? d : 0 }],
    };
  });
  const arrowPos =
    dir === "left" ? { left: cx - R - 54, top: cy - 18 } : dir === "right" ? { left: cx + R + 18, top: cy - 18 } : dir === "up" ? { left: cx - 18, top: cy - R - 54 } : { left: cx - 18, top: cy + R + 18 };

  const hole = `M0 0H${width}V${height}H0Z M${cx - R} ${cy} a${R} ${R} 0 1 0 ${D} 0 a${R} ${R} 0 1 0 ${-D} 0Z`;
  const tickColor = (i: number) => {
    if (finished) return GREEN;
    const side = sideOf(i);
    const idx = side === "up" ? (i + PER_SIDE / 2) % TICKS : i - (side === "right" ? PER_SIDE / 2 : side === "down" ? PER_SIDE * 1.5 : PER_SIDE * 2.5);
    if ((lit[side] ?? 0) > idx) return GOLD;
    if (ready && side === dir) return "rgba(255,255,255,0.75)";
    return ready ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.16)";
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Contenu dans le cercle (silhouette sur l'aperçu web) + ligne de scan. */}
      <View style={{ position: "absolute", left: cx - R, top: cy - R, width: D, height: D, borderRadius: R, overflow: "hidden" }}>
        {inside}
        {!finished ? (
          <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 60 }, sweepStyle]}>
            <LinearGradient colors={["rgba(216,173,106,0)", "rgba(216,173,106,0.38)"]} style={{ flex: 1 }} />
            <View style={{ height: 2, backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 1, shadowRadius: 8 }} />
          </Animated.View>
        ) : null}
      </View>

      {/* Masque sombre avec le trou rond + graduations. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={hole} fill="rgba(5,5,5,0.86)" fillRule="evenodd" />
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI;
          const r1 = R + 10;
          const r2 = R + 24;
          return (
            <Line
              key={i}
              x1={cx + r1 * Math.sin(a)}
              y1={cy - r1 * Math.cos(a)}
              x2={cx + r2 * Math.sin(a)}
              y2={cy - r2 * Math.cos(a)}
              stroke={tickColor(i)}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>

      {/* Bord du cercle : doré quand le visage est bien placé. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: cx - R - 2, top: cy - R - 2, width: D + 4, height: D + 4, borderRadius: R + 2, borderWidth: 2, borderColor: finished ? GREEN : faceSeen ? GOLD : "rgba(255,255,255,0.18)" }}
      />

      {finished ? (
        <Animated.View entering={ZoomIn.duration(360)} style={{ position: "absolute", left: cx - 44, top: cy - 44, width: 88, height: 88, borderRadius: 44, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="checkmark" size={56} color="#fff" />
        </Animated.View>
      ) : ready ? (
        <Animated.View style={[{ position: "absolute", width: 36, height: 36 }, arrowPos, arrowStyle]} pointerEvents="none">
          <Ionicons name={cur.icon} size={36} color={GOLD} />
        </Animated.View>
      ) : null}

      {/* En-tête. */}
      <View style={[st.top, { top: insets.top + 8 }]}>
        <Press onPress={onClose} style={st.close} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Press>
        <Text style={st.topTitle}>Scan du visage</Text>
        <Text style={st.topCount}>{finished ? "5/5" : `${Math.min(step + 1, 5)}/5`}</Text>
      </View>

      {/* Consigne + aide. */}
      <View style={{ position: "absolute", left: 24, right: 24, top: cy + R + 70, alignItems: "center", gap: 12 }}>
        <Animated.Text key={finished ? "fin" : step} entering={FadeInDown.duration(300)} style={st.title}>
          {finished ? "Scan terminé" : cur.title}
        </Animated.Text>
        {hint && !finished ? (
          <Animated.View key={hint} entering={FadeIn.duration(200)} style={st.hint}>
            <Ionicons name="information-circle" size={16} color={GOLD} />
            <Text style={st.hintText}>{hint}</Text>
          </Animated.View>
        ) : (
          <Text style={st.sub}>{finished ? "Votre visage a bien été enregistré." : "Gardez le visage dans le cercle et bougez lentement."}</Text>
        )}
      </View>

      {/* Étapes. */}
      <View style={[st.dots, { bottom: insets.bottom + 34 }]}>
        {SCAN_STEPS.map((s, i) => {
          const ok = finished || done.includes(s.key);
          return <View key={s.key} style={[st.dot, ok && { backgroundColor: finished ? GREEN : GOLD, width: 22 }, !ok && i === step && { backgroundColor: "rgba(255,255,255,0.7)" }]} />;
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  topTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  topCount: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", width: 40, textAlign: "right" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.4 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", lineHeight: 19 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: "rgba(216,173,106,0.16)" },
  hintText: { color: "#F3D49B", fontSize: 13, fontWeight: "600" },
  dots: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
});
```

### D. Écran d'analyse — `src/components/verification/Analysis.tsx`

```tsx
// Écran « Vérification en cours… » : anneau qui tourne autour d'un bouclier, pourcentage, et liste
// d'étapes qui se cochent une à une. `task` (ex. l'envoi des photos) doit être terminée avant la dernière coche.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { GOLD, GREEN } from "./scanShared";

const SIZE = 168;
const R = 72;
const C = 2 * Math.PI * R;
const STEP_MS = 1100;

export function Analysis({
  title,
  doneTitle,
  steps,
  task,
  onDone,
  onError,
}: {
  title: string;
  doneTitle: string;
  steps: string[];
  task?: () => Promise<void>;
  onDone: () => void;
  onError?: (message: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0); // étape en cours ; steps.length = tout est validé
  const [pct, setPct] = useState(0);
  const taskRef = useRef<Promise<void> | null>(null);
  const finished = active >= steps.length;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  useEffect(() => {
    taskRef.current = task ? task() : Promise.resolve();
    taskRef.current.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avance d'une étape toutes les ~1 s ; la dernière attend la fin de la tâche.
  useEffect(() => {
    if (finished) {
      const t = setTimeout(onDone, 1400);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const t = setTimeout(() => {
      const last = active === steps.length - 1;
      const go = () => !cancelled && setActive((a) => a + 1);
      if (!last) return go();
      taskRef.current!.then(go, (e: Error) => !cancelled && onError?.(e.message || "Une erreur est survenue"));
    }, STEP_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, finished]);

  // Pourcentage qui monte doucement vers l'étape suivante.
  useEffect(() => {
    const target = finished ? 100 : Math.round(((active + 0.85) / steps.length) * 100);
    const t = setInterval(() => setPct((p) => (p < target ? p + 1 : p)), 16);
    return () => clearInterval(t);
  }, [active, finished, steps.length]);

  return (
    <View style={[StyleSheet.absoluteFill, st.wrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 30 }]}>
      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={finished ? GREEN : GOLD}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        {!finished ? (
          <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
            <Svg width={SIZE} height={SIZE}>
              <Defs>
                <SvgGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={GOLD} stopOpacity="0" />
                  <Stop offset="1" stopColor={GOLD} stopOpacity="0.9" />
                </SvgGradient>
              </Defs>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R + 14} stroke="url(#g)" strokeWidth={2} fill="none" strokeDasharray={`${C * 0.3} ${C}`} strokeLinecap="round" />
            </Svg>
          </Animated.View>
        ) : null}
        {finished ? (
          <Animated.View entering={ZoomIn.duration(360)} style={[st.badge, { backgroundColor: GREEN }]}>
            <Ionicons name="checkmark" size={54} color="#fff" />
          </Animated.View>
        ) : (
          <View style={st.badge}>
            <Ionicons name="shield-half-outline" size={40} color={GOLD} />
            <Text style={st.pct}>{pct} %</Text>
          </View>
        )}
      </View>

      <Animated.Text key={finished ? "ok" : "wait"} entering={FadeInDown.duration(300)} style={st.title}>
        {finished ? doneTitle : title}
      </Animated.Text>

      <View style={st.list}>
        {steps.map((label, i) => {
          const ok = i < active;
          const now = i === active;
          return (
            <Animated.View key={label} entering={FadeInDown.delay(i * 90).duration(300)} style={st.row}>
              <View style={[st.dot, ok && { backgroundColor: GREEN, borderColor: GREEN }]}>
                {ok ? <Ionicons name="checkmark" size={14} color="#fff" /> : now ? <ActivityIndicator size="small" color={GOLD} /> : null}
              </View>
              <Text style={[st.rowText, (ok || now) && { color: "#fff" }]}>{label}</Text>
            </Animated.View>
          );
        })}
      </View>

      <View style={st.secure}>
        <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.5)" />
        <Text style={st.secureText}>{"Données chiffrées · visibles seulement par l'équipe de vérification"}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: "#0B0B0B", alignItems: "center", paddingHorizontal: 28, gap: 26 },
  badge: { width: 116, height: 116, borderRadius: 58, backgroundColor: "rgba(216,173,106,0.10)", alignItems: "center", justifyContent: "center", gap: 2 },
  pct: { color: "#fff", fontSize: 15, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  list: { alignSelf: "stretch", gap: 16, paddingHorizontal: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  rowText: { color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "600", flex: 1 },
  secure: { marginTop: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  secureText: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center" },
});
```

### E. Photo de la pièce (habillage) — `src/components/verification/docShared.tsx`

```tsx
// Habillage commun de la photo de la pièce d'identité : cadre au format carte, coins dorés,
// ligne de scan, déclencheur, puis vérification de la photo (« Reprendre » / « Valider »).
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { pickMedia, type Picked } from "../../backend/upload";
import { toast } from "../../kit";
import { Button, Press } from "../../ui";
import { GOLD } from "./scanShared";

export type DocSide = { title: string; sub: string; ratio: number; step: string };

export function DocCaptureUI({
  side,
  cameraLayer,
  shoot,
  onDone,
  onCancel,
}: {
  side: DocSide;
  cameraLayer?: ReactNode;
  shoot?: () => Promise<Picked | null>;
  onDone: (p: Picked) => void;
  onCancel: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [shot, setShot] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);

  const W = width - 40;
  const H = W / side.ratio;
  const x = 20;
  const y = insets.top + 150;
  const r = 18;

  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -40 + sweep.value * (H + 10) }] }));

  const hole = `M0 0H${width}V${height}H0Z M${x + r} ${y}H${x + W - r}A${r} ${r} 0 0 1 ${x + W} ${y + r}V${y + H - r}A${r} ${r} 0 0 1 ${x + W - r} ${y + H}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + H - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const L = 34;
  const corners = [
    `M${x} ${y + L}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + L}`,
    `M${x + W - L} ${y}H${x + W - r}A${r} ${r} 0 0 1 ${x + W} ${y + r}V${y + L}`,
    `M${x + W} ${y + H - L}V${y + H - r}A${r} ${r} 0 0 1 ${x + W - r} ${y + H}H${x + W - L}`,
    `M${x + L} ${y + H}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + H - r}V${y + H - L}`,
  ];

  const take = async (fromGallery: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const p = fromGallery || !shoot ? await pickMedia("image") : await shoot();
      if (p) setShot(p);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
      {shot ? null : cameraLayer}
      <View style={{ position: "absolute", left: x, top: y, width: W, height: H, borderRadius: r, overflow: "hidden" }}>
        {shot ? (
          <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
            <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : (
          <>
            {!cameraLayer ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1A1712", alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="card-outline" size={64} color="#3A332A" />
              </View>
            ) : null}
            <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 40 }, sweepStyle]}>
              <LinearGradient colors={["rgba(216,173,106,0)", "rgba(216,173,106,0.32)"]} style={{ flex: 1 }} />
              <View style={{ height: 2, backgroundColor: GOLD }} />
            </Animated.View>
          </>
        )}
      </View>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={hole} fill="rgba(5,5,5,0.82)" fillRule="evenodd" />
        {corners.map((d) => (
          <Path key={d} d={d} stroke={GOLD} strokeWidth={4} fill="none" strokeLinecap="round" />
        ))}
      </Svg>

      <View style={[st.top, { top: insets.top + 8 }]}>
        <Press onPress={onCancel} style={st.close} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Press>
        <Text style={st.topTitle}>{"Pièce d'identité"}</Text>
        <Text style={st.topCount}>{side.step}</Text>
      </View>
      <Animated.View key={side.title + (shot ? "1" : "0")} entering={FadeInDown.duration(300)} style={{ position: "absolute", left: 24, right: 24, top: insets.top + 66, alignItems: "center", gap: 6 }}>
        <Text style={st.title}>{shot ? "La photo est-elle lisible ?" : side.title}</Text>
        <Text style={st.sub}>{shot ? "Vérifiez que tout le texte et la photo sont nets, sans reflet." : side.sub}</Text>
      </Animated.View>

      <View style={{ position: "absolute", left: 24, right: 24, top: y + H + 28, gap: 10 }}>
        {[
          ["sunny-outline", "Bonne lumière, sans reflet"],
          ["scan-outline", "Les 4 coins visibles dans le cadre"],
          ["eye-outline", "Texte et photo bien nets"],
        ].map(([ic, t]) => (
          <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={17} color={GOLD} />
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={[st.bottom, { bottom: insets.bottom + 24 }]}>
        {shot ? (
          <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
            <Button label="Reprendre" variant="outline" icon="refresh" style={{ flex: 1 }} onPress={() => setShot(null)} />
            <Button label="Valider" icon="checkmark" style={{ flex: 1 }} onPress={() => onDone(shot)} />
          </View>
        ) : shoot ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", paddingHorizontal: 20 }}>
            <Press onPress={() => void take(true)} style={st.side}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </Press>
            <Press onPress={() => void take(false)} style={st.shutter} scaleTo={0.9}>
              {busy ? <ActivityIndicator color="#000" /> : <View style={st.shutterIn} />}
            </Press>
            <View style={{ width: 48 }} />
          </View>
        ) : (
          <Button label={busy ? "Ouverture…" : "Choisir une photo"} icon="images-outline" style={{ alignSelf: "stretch" }} onPress={() => void take(true)} />
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  topTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  topCount: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", width: 40, textAlign: "right" },
  title: { color: "#fff", fontSize: 21, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", lineHeight: 19 },
  bottom: { position: "absolute", left: 20, right: 20, alignItems: "center" },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterIn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" },
  side: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
});
```

### F. Photo de la pièce (caméra arrière) — `src/components/verification/DocCapture.native.tsx`

```tsx
// Photo de la pièce d'identité sur téléphone : caméra arrière dans l'app, cadre au format carte.
import { StyleSheet } from "react-native";
import { Camera, CommonResolutions, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import type { Picked } from "../../backend/upload";
import { DocCaptureUI, type DocSide } from "./docShared";

export function DocCapture(props: { side: DocSide; onDone: (p: Picked) => void; onCancel: () => void }) {
  const permission = useCameraPermission();
  const photo = usePhotoOutput({ targetResolution: CommonResolutions.FHD_4_3, containerFormat: "jpeg", quality: 0.9 });
  const shoot = async (): Promise<Picked | null> => {
    if (!permission.hasPermission && !(await permission.requestPermission())) throw new Error("Autorisez la caméra dans les réglages du téléphone");
    const f = await photo.capturePhotoToFile({ enableShutterSound: true }, {});
    return { uri: f.filePath.startsWith("file://") ? f.filePath : `file://${f.filePath}`, mime: "image/jpeg", name: `${Date.now()}.jpg`, kind: "image" };
  };
  return (
    <DocCaptureUI
      {...props}
      shoot={shoot}
      cameraLayer={permission.hasPermission ? <Camera style={StyleSheet.absoluteFill} device="back" isActive outputs={[photo]} resizeMode="cover" /> : undefined}
    />
  );
}
```

### G. Contrôles automatiques de la pièce — `src/components/verification/docChecks.native.ts`

```ts
// Contrôles automatiques de la pièce d'identité, faits sur le téléphone (gratuits, rien n'est envoyé
// à un service extérieur) : lecture du texte (Apple Vision / Google ML Kit), bande MRZ et ses chiffres
// de contrôle, date d'expiration, nom comparé au profil, visage présent sur la pièce.
// Ils aident l'admin à décider ; ils ne remplacent pas sa validation.
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { createImageFaceDetector } from "react-native-vision-camera-face-detector";
import type { Picked } from "../../backend/upload";
import { findMrz, mrzDate, nameWords } from "../../mrz";
import type { IdentityChecks } from "../../types";

export async function checkDocument(photos: Picked[], fullName: string, docKey: string): Promise<IdentityChecks> {
  const res: IdentityChecks = { doc_type: docKey, available: true, checked_at: new Date().toISOString() };

  // 1. Texte lu sur chaque face.
  const lines: string[] = [];
  if (isSupported)
    for (const p of photos) {
      try {
        lines.push(...(await extractTextFromImage(p.uri)));
      } catch {
        /* photo illisible : on continue avec l'autre face */
      }
    }
  res.text_found = lines.join(" ").replace(/\s/g, "").length >= 20;

  // 2. Bande MRZ (passeport, dos des cartes récentes) : chiffres de contrôle, expiration, nom.
  const mrz = findMrz(lines);
  res.mrz_found = !!mrz;
  if (mrz) {
    res.mrz_checks = `${mrz.checksPassed}/${mrz.checksTotal}`;
    res.mrz_valid = mrz.checksOk;
    res.doc_number = mrz.docNumber;
    res.country = mrz.country;
    res.doc_name = [mrz.givenNames, mrz.surname].filter(Boolean).join(" ");
    const exp = mrzDate(mrz.expiry);
    if (exp) {
      res.expiry = exp.toISOString().slice(0, 10);
      res.expired = exp.getTime() < Date.now();
    }
  }

  // 3. Le nom du profil apparaît-il sur la pièce (bande MRZ ou texte imprimé) ?
  const mine = nameWords(fullName);
  const onDoc = new Set(nameWords(mrz ? `${mrz.surname} ${mrz.givenNames}` : lines.join(" ")));
  if (mine.length) res.name_match = mine.filter((w) => onDoc.has(w)).length >= Math.min(2, mine.length);

  // 4. Un visage (la photo d'identité) est-il présent sur la pièce ?
  try {
    const detector = createImageFaceDetector({ performanceMode: "accurate", minFaceSize: 0.05 });
    res.face_on_doc = photos.some((p) => detector.detectFaces({ uri: p.uri }).length > 0);
  } catch {
    res.face_on_doc = undefined;
  }
  return res;
}
```

### H. Présentation des contrôles + verdict — `src/components/verification/checkRows.ts`

```ts
// Présentation des contrôles automatiques de la pièce (pour la personne et pour l'admin).
import type { IdentityChecks } from "../../types";

export type CheckRow = { label: string; ok: boolean | null; detail?: string };

const frDate = (iso: string) => iso.split("-").reverse().join("/");

export function checkRows(c: IdentityChecks): CheckRow[] {
  const passport = c.doc_type === "passeport";
  const rows: CheckRow[] = [
    { label: "Visage présent sur la pièce", ok: c.face_on_doc ?? null },
    { label: "Texte de la pièce lisible", ok: c.text_found ?? null },
    {
      label: "Bande de sécurité (MRZ) lue",
      // Passeport : toujours présente. Autres pièces : seulement sur les modèles récents.
      ok: c.mrz_found ? true : passport ? false : null,
      detail: c.mrz_found ? undefined : passport ? "Introuvable : photographiez toute la page" : "Non trouvée sur ce document",
    },
  ];
  if (c.mrz_found) rows.push({ label: "Chiffres de sécurité valides", ok: c.mrz_valid ?? null, detail: c.mrz_checks });
  if (c.expiry) rows.push({ label: "Pièce en cours de validité", ok: !c.expired, detail: `${c.expired ? "Expirée le" : "Expire le"} ${frDate(c.expiry)}` });
  rows.push({ label: "Nom identique au profil", ok: c.name_match ?? null, detail: c.doc_name });
  return rows;
}

/** « ok » : tout est bon ; « fail » : pièce expirée ; « warn » : un contrôle n'a pas abouti. */
export function checkVerdict(c: IdentityChecks): "ok" | "warn" | "fail" {
  if (c.expired) return "fail";
  return checkRows(c).every((r) => r.ok !== false) && c.face_on_doc && c.name_match ? "ok" : "warn";
}
```

### I. Écran-chef d'orchestre (toutes les étapes) — `app/verification/identity.tsx`

```tsx
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Banner, Card, fmtDate, Screen, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { IdentityChecks, Profile } from "../../src/types";
import { Button, Press } from "../../src/ui";
import { isLive, uploadFile, type Picked } from "../../src/backend/upload";
import { Analysis } from "../../src/components/verification/Analysis";
import { DocCapture } from "../../src/components/verification/DocCapture";
import { FaceScan } from "../../src/components/verification/FaceScan";
import { checkRows, checkVerdict } from "../../src/components/verification/checkRows";
import { checkDocument } from "../../src/components/verification/docChecks";

// Pièces acceptées ; le passeport n'a qu'une face à photographier (la page avec la photo).
const DOC_TYPES = [
  { key: "cni", label: "Carte d'identité", hint: "Recto et verso", icon: "card-outline", back: true },
  { key: "passeport", label: "Passeport", hint: "Page avec la photo", icon: "book-outline", back: false },
  { key: "permis", label: "Permis de conduire", hint: "Recto et verso", icon: "car-outline", back: true },
  { key: "sejour", label: "Carte de séjour", hint: "Recto et verso", icon: "document-text-outline", back: true },
] as const;
type DocType = (typeof DOC_TYPES)[number];

export default function IdentityScreen() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  if (!me) return <Redirect href="/" />;
  return <Identity me={me} />;
}

function EmailCard({ me }: { me: Profile }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.iconBox, { backgroundColor: me.email_verified ? colors.successSoft : colors.warningSoft }]}>
          <Ionicons name={me.email_verified ? "mail" : "mail-unread-outline"} size={20} color={me.email_verified ? colors.success : colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Email</Text>
          <Text style={type.small}>{me.email_verified ? "Adresse vérifiée" : "En attente de confirmation"}</Text>
        </View>
        {!me.email_verified ? <Button label="Renvoyer" small variant="ghost" icon={null} onPress={() =>
              void useDB
                .getState()
                .resendVerification()
                .then((r) => (r.ok ? toast("Email de confirmation renvoyé") : toast(r.error, "error")))
            }
          /> : <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
      </View>
    </Card>
  );
}

function Identity({ me }: { me: Profile }) {
  const submitIdentity = useDB((s) => s.submitIdentity);
  const [phase, setPhase] = useState<"intro" | "face" | "faceCheck" | "docType" | "docFront" | "docBack" | "checking" | "checkResult" | "sending">("intro");
  const [selfies, setSelfies] = useState<Picked[]>([]);
  const [doc, setDoc] = useState<DocType>(DOC_TYPES[0]);
  const [front, setFront] = useState<Picked | null>(null);
  const [back, setBack] = useState<Picked | null>(null);
  const [checks, setChecks] = useState<IdentityChecks | null>(null);
  const uploaded = useRef<{ document_url?: string; selfie_url?: string }>({});
  // Aperçu web (pas de caméra) : le parcours se visite, mais rien n'est envoyé en ligne.
  const preview = Platform.OS === "web";

  if (me.identity_verified)
    return (
      <Screen title="Vérification d'identité">
        <Animated.View entering={ZoomIn.duration(320)} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="shield-checkmark" size={52} color={colors.success} />
          </View>
          <Text style={type.h1}>Identité vérifiée</Text>
          <Text style={[type.body, { textAlign: "center" }]}>Votre compte est certifié. Le badge « Vérifié » est visible sur votre profil.</Text>
        </Animated.View>
        <EmailCard me={me} />
        <Button label="Retour au profil" variant="outline" icon={null} onPress={() => router.back()} />
      </Screen>
    );

  if (me.identity_submitted_at)
    return (
      <Screen title="Vérification d'identité">
        <Animated.View entering={ZoomIn.duration(320)} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="hourglass-outline" size={48} color={colors.warning} />
          </View>
          <Text style={type.h1}>Vérification en cours</Text>
          <Text style={[type.body, { textAlign: "center" }]}>
            Demande envoyée le {fmtDate(me.identity_submitted_at, true)}
            {me.identity_method === "face_scan" ? " (scan du visage et pièce d'identité)" : me.identity_method === "selfie" ? " (vérification faciale)" : " (document)"}. Notre équipe vous répond sous 24 h.
          </Text>
        </Animated.View>
        <EmailCard me={me} />
        <Banner tone="info">Vous recevrez une notification dès que votre identité sera validée.</Banner>
        <Button label="Retour au profil" variant="outline" icon={null} onPress={() => router.back()} />
      </Screen>
    );

  const restart = () => {
    setSelfies([]);
    setFront(null);
    setBack(null);
    setPhase("intro");
  };

  if (phase === "face")
    return (
      <View style={styles.full}>
        <FaceScan
          onCancel={() => setPhase("intro")}
          onDone={(photos) => {
            setSelfies(photos);
            setPhase("faceCheck");
          }}
        />
      </View>
    );

  if (phase === "faceCheck")
    return (
      <View style={styles.full}>
        <Analysis
          title="Vérification du visage…"
          doneTitle="Visage validé"
          steps={["Analyse des points du visage", "Détection de présence réelle", "Contrôle de la netteté des photos"]}
          task={async () => {
            if (!preview && selfies.length === 0) throw new Error("Les photos du visage n'ont pas été enregistrées. Recommencez le scan.");
          }}
          onError={(m) => {
            toast(m, "error");
            setPhase("intro");
          }}
          onDone={() => setPhase("docType")}
        />
      </View>
    );

  if (phase === "docFront" || phase === "docBack") {
    const isFront = phase === "docFront";
    return (
      <View style={styles.full}>
        <DocCapture
          key={phase}
          side={{
            title: doc.key === "passeport" ? "Page photo du passeport" : `${isFront ? "Recto" : "Verso"} : ${doc.label.toLowerCase()}`,
            sub: isFront ? "Placez le document dans le cadre, bien à plat." : "Retournez le document et placez-le dans le cadre.",
            ratio: doc.key === "passeport" ? 1.42 : 1.586,
            step: doc.back ? (isFront ? "1/2" : "2/2") : "1/1",
          }}
          onCancel={() => setPhase("docType")}
          onDone={(p) => {
            if (isFront) {
              setFront(p);
              setPhase(doc.back ? "docBack" : "checking");
            } else {
              setBack(p);
              setPhase("checking");
            }
          }}
        />
      </View>
    );
  }

  if (phase === "checking")
    return (
      <View style={styles.full}>
        <Analysis
          title="Analyse de la pièce…"
          doneTitle="Analyse terminée"
          steps={["Lecture du texte de la pièce", "Lecture de la bande de sécurité (MRZ)", "Contrôle des chiffres de sécurité", "Recherche du visage sur la pièce"]}
          task={async () => {
            setChecks(await checkDocument([front, back].filter((x): x is Picked => !!x), me.full_name ?? "", doc.key));
          }}
          onError={() => setPhase("sending")}
          onDone={() => setPhase("checkResult")}
        />
      </View>
    );

  if (phase === "checkResult") {
    // Aperçu web : pas de contrôles possibles, on passe directement à l'envoi.
    if (!checks?.available) {
      setTimeout(() => setPhase("sending"), 0);
      return <View style={styles.full} />;
    }
    const verdict = checkVerdict(checks);
    const retake = () => {
      setFront(null);
      setBack(null);
      setPhase("docFront");
    };
    return (
      <Screen
        title="Contrôle de votre pièce"
        subtitle={doc.label}
        footer={
          verdict === "fail" ? (
            <Button label="Choisir une autre pièce" icon="card-outline" style={{ flex: 1 }} onPress={() => setPhase("docType")} />
          ) : verdict === "ok" ? (
            <Button label="Envoyer ma demande" icon="send-outline" style={{ flex: 1 }} onPress={() => setPhase("sending")} />
          ) : (
            <View style={{ flex: 1, gap: 8 }}>
              <Button label="Reprendre les photos" icon="camera-outline" onPress={retake} />
              <Button label="Envoyer quand même" variant="outline" icon={null} onPress={() => setPhase("sending")} />
            </View>
          )
        }
      >
        <Animated.View entering={ZoomIn.duration(320)} style={{ alignItems: "center", gap: 10, marginTop: 4 }}>
          <View style={[styles.bigIcon, { backgroundColor: verdict === "ok" ? colors.successSoft : verdict === "fail" ? colors.dangerSoft : colors.warningSoft }]}>
            <Ionicons
              name={verdict === "ok" ? "shield-checkmark" : verdict === "fail" ? "close-circle" : "alert-circle"}
              size={50}
              color={verdict === "ok" ? colors.success : verdict === "fail" ? colors.danger : colors.warning}
            />
          </View>
          <Text style={[type.h1, { textAlign: "center" }]}>
            {verdict === "ok" ? "Pièce reconnue" : verdict === "fail" ? "Pièce expirée" : "Contrôle incomplet"}
          </Text>
          <Text style={[type.body, { textAlign: "center" }]}>
            {verdict === "ok"
              ? "Votre pièce a passé les contrôles automatiques. Notre équipe confirmera sous 24 h."
              : verdict === "fail"
                ? "Cette pièce n'est plus valide. Utilisez une pièce d'identité en cours de validité."
                : "Certains contrôles n'ont pas abouti (photo floue, reflet, document coupé…). Reprenez les photos, ou envoyez quand même : notre équipe vérifiera."}
          </Text>
        </Animated.View>
        <Card style={{ gap: 14 }}>
          {checkRows(checks).map((r, i) => (
            <Animated.View key={r.label} entering={FadeInDown.delay(i * 70).duration(280)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Ionicons
                name={r.ok === true ? "checkmark-circle" : r.ok === false ? "close-circle" : "remove-circle-outline"}
                size={22}
                color={r.ok === true ? colors.success : r.ok === false ? colors.danger : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{r.label}</Text>
                {r.detail ? <Text style={type.small}>{r.detail}</Text> : null}
              </View>
            </Animated.View>
          ))}
        </Card>
      </Screen>
    );
  }

  if (phase === "sending")
    return (
      <View style={styles.full}>
        <Analysis
          title="Vérification en cours…"
          doneTitle="Demande envoyée"
          steps={["Chiffrement des photos", "Envoi sécurisé des fichiers", "Contrôle de la qualité du document", "Transmission à l'équipe de vérification"]}
          task={async () => {
            if (preview || !isLive()) return;
            const sub = `identity/${Date.now()}`;
            let selfie_url: string | undefined;
            for (const p of selfies) {
              const path = await uploadFile("selfies", p, sub);
              selfie_url = selfie_url ?? path;
            }
            const document_url = front ? await uploadFile("identity-documents", { ...front, name: `recto-${doc.key}.jpg` }, sub) : undefined;
            if (back) await uploadFile("identity-documents", { ...back, name: `verso-${doc.key}.jpg` }, sub);
            uploaded.current = { document_url, selfie_url };
          }}
          onError={(m) => {
            toast(m, "error");
            setPhase("docType");
          }}
          onDone={() => {
            if (preview && isLive()) {
              toast("Aperçu terminé : la vraie vérification se fait depuis l'app sur téléphone.");
              return restart();
            }
            submitIdentity("face_scan", uploaded.current, checks ?? undefined);
            toast("Demande envoyée ! Réponse sous 24 h.");
          }}
        />
      </View>
    );

  if (phase === "docType")
    return (
      <Screen title="Votre pièce d'identité" subtitle="Étape 2 sur 2">
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.okBox]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={[type.h3, { flex: 1 }]}>Scan du visage validé</Text>
        </Animated.View>
        <Text style={type.body}>Choisissez le document à photographier. Il doit être valide et à votre nom.</Text>
        {DOC_TYPES.map((d, i) => (
          <Animated.View key={d.key} entering={FadeInDown.delay(i * 60).duration(300)}>
            <Press
              scaleTo={0.98}
              style={styles.docRow}
              onPress={() => {
                setDoc(d);
                setFront(null);
                setBack(null);
                setPhase("docFront");
              }}
            >
              <View style={styles.docIcon}>
                <Ionicons name={d.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{d.label}</Text>
                <Text style={type.small}>{d.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Press>
          </Animated.View>
        ))}
        <Banner tone="info" icon="lock-closed-outline">
          {"Vos documents sont chiffrés et visibles uniquement par l'équipe de vérification Collab Créa."}
        </Banner>
      </Screen>
    );

  return (
    <Screen
      title="Vérification d'identité"
      subtitle="Environ 2 minutes"
      footer={<Button label="Commencer la vérification" icon="scan-outline" style={{ flex: 1 }} onPress={() => setPhase("face")} />}
    >
      <Animated.View entering={FadeInDown.duration(320)} style={{ alignItems: "center", gap: 10, marginTop: 4 }}>
        <View style={[styles.bigIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="scan-outline" size={50} color={colors.primary} />
        </View>
        <Text style={[type.h1, { textAlign: "center" }]}>Vérifiez votre identité</Text>
        <Text style={[type.body, { textAlign: "center" }]}>
          {me.role === "brand" ? "Obligatoire pour engager des créateurs." : "Obligatoire pour postuler aux offres."} Votre profil reçoit le badge « Vérifié ».
        </Text>
      </Animated.View>

      <Card style={{ gap: 16 }}>
        {[
          ["scan-outline", "Scan du visage", "Tournez la tête comme demandé : devant, gauche, droite, haut, bas."],
          ["card-outline", "Pièce d'identité", "Photo de votre carte d'identité, passeport, permis ou carte de séjour."],
          ["shield-checkmark-outline", "Validation", "Notre équipe compare votre visage et votre pièce, sous 24 h."],
        ].map(([ic, t, d], i) => (
          <Animated.View key={t} entering={FadeInDown.delay(100 + i * 80).duration(300)} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={styles.stepNum}>
              <Text style={{ color: colors.onPrimary, fontWeight: "800", fontSize: 13 }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={16} color={colors.primary} />
                <Text style={type.h3}>{t}</Text>
              </View>
              <Text style={type.small}>{d}</Text>
            </View>
          </Animated.View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={type.h3}>Pour réussir du premier coup</Text>
        {[
          ["sunny-outline", "Un endroit bien éclairé"],
          ["glasses-outline", "Sans lunettes de soleil, chapeau ni masque"],
          ["person-outline", "Seul(e) devant l'écran"],
        ].map(([ic, t]) => (
          <View key={t} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
            <Text style={[type.body, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
      </Card>

      <EmailCard me={me} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bigIcon: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", ...shadow.soft },
  full: { flex: 1, backgroundColor: "#000" },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 1 },
  okBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.successSoft },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  docIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});
```

> Le composant `Screen`, `Card`, `Button`, `Press`, `toast`, les couleurs (`colors`) et le store (`useDB`) sont ceux de Collab Créa : les remplacer par les équivalents de l'app cible. `uploadFile(bucket, fichier, sous-dossier)` envoie dans `{user_id}/{sous-dossier}/{nom}` sur Supabase Storage et renvoie le chemin.
