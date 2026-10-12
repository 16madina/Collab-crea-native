// Démarrage : applique le ton mémorisé (sombre / clair) AVANT de charger les écrans,
// pour que tous les styles de l'app soient créés avec les bonnes couleurs.
import { useEffect, useState, type ComponentType } from "react";
import { View } from "react-native";
import { bootFlags, loadTone } from "./appearance";
import { supabase } from "./backend/supabase";
import { applyTone, colors } from "./theme";

export default function Boot() {
  const [App, setApp] = useState<ComponentType | null>(null);
  useEffect(() => {
    void (async () => {
      const t = await loadTone();
      // Session déjà ouverte : on ira directement à l'accueil (pas d'onboarding).
      const session = await supabase.auth.getSession().then((r) => r.data.session, () => null);
      if (session) bootFlags.goHome = true;
      applyTone(t);
      // Chargé seulement maintenant : les écrans lisent les couleurs du ton choisi.
      const { App: Root } = require("expo-router/build/qualified-entry");
      setApp(() => Root);
    })();
  }, []);
  if (!App) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <App />;
}
