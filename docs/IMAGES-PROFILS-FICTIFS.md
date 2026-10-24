# Nouvelles photos des profils fictifs (à générer sur Grok)

Problème : les profils fictifs (`src/seed.ts`, et les profils `is_demo = true` dans Supabase) réutilisent des
visages découpés dans les maquettes (`assets/creators/c0..c8.jpg`) → images zoomées et floues.

À faire : générer une image par personne sur Grok (carré ou portrait), les enregistrer dans `assets/creators/`
avec le nom ci-dessous, recadrer proprement (carré net, ~800 px), puis brancher `FACE_OF` dans `src/seed.ts`
et mettre à jour `avatar_url` des profils `is_demo` dans Supabase. Vérifier ensuite accueil, Explorer, profils, grille tarifaire.

Style à coller avant chaque description :
> Photo portrait réaliste, style photo Instagram professionnelle, lumière naturelle douce, arrière-plan flou,
> cadrage buste, visage net et souriant, haute qualité, 4K —

| Fichier | Profil | Description |
|---|---|---|
| aicha.jpg | u_aicha | femme ivoirienne, 26 ans, créatrice lifestyle, tresses longues, tenue chic beige, café en terrasse |
| kofi.jpg | u_kofi | homme ghanéen, 27 ans, humoriste, grand sourire, chemise colorée en wax, rue animée d'Accra |
| awa.jpg | u_awa | femme malienne, 24 ans, influenceuse beauté, maquillage glamour, foulard élégant, studio rose poudré |
| chidi.jpg | u_chidi | homme nigérian, 30 ans, youtubeur tech, lunettes, t-shirt noir, bureau moderne avec ordinateur |
| fatou.jpg | u_fatou | femme sénégalaise, 25 ans, mode, robe élégante, cheveux courts naturels, lumière de fin de journée à Dakar |
| moussa.jpg | u_moussa | homme sénégalais, 28 ans, gamer, casque audio autour du cou, éclairage néon violet |
| nadia.jpg | u_nadia | femme ivoirienne, 29 ans, voyage, chapeau de paille, plage d'Assinie en arrière-plan |
| amina.jpg | u_amina | femme malienne, 32 ans, cuisinière, tablier, cuisine chaleureuse, plat coloré devant elle |
| yao.jpg | u_yao | homme ivoirien, 26 ans, coach fitness, tenue de sport, salle de sport lumineuse |
| ibrahim.jpg | u_ibrahim | homme sénégalais, 31 ans, sportif, maillot de course, parc en plein air au matin |
| esther.jpg | u_esther | femme camerounaise, 34 ans, cheffe cuisine, tenue élégante, marché coloré de Douala |

## Fait (23/10/2026)

Les 11 portraits ont été générés sur Grok (carré 1408 px, réduits à 800 px) et enregistrés dans
`assets/creators/<prénom>.jpg`. Ils sont branchés dans `src/seed.ts` (`FACE_OF`), déclarés dans
`src/assets.ts`, et les profils `is_demo` de Supabase pointent vers `asset:creators/<prénom>`.
Les anciens visages découpés `c0…c8` restent dans le dossier (encore utilisés ailleurs, ex. fond de la case
« Créateur » à l'inscription). Une nouvelle build de l'app est nécessaire pour voir les photos sur téléphone.
