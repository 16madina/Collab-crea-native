# Collab Créa — application native (Expo)

Refonte 100 % native de Collab Créa : Expo Router, Reanimated, glassmorphism (`expo-blur`), retours haptiques.

Phase actuelle : **UI uniquement**, avec des données fictives (`src/data.ts`). Le back-end (nouveau projet Supabase) viendra ensuite.

```bash
npm install
npx expo start   # scanner le QR code avec Expo Go
```

- `app/index.tsx` — accueil / choix créateur ou marque
- `app/(tabs)/` — Accueil, Campagnes, Messages, Profil (barre d'onglets en verre + bouton « + »)
- `app/offer/[id].tsx` — détail d'une campagne (en-tête parallaxe)
- `app/chat/[id].tsx` — conversation
- `app/create.tsx` — feuille « Créer »
- `src/theme.ts`, `src/ui.tsx` — design system
