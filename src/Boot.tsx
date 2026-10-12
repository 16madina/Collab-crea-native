// Démarrage : applique le ton mémorisé (sombre / clair) AVANT de charger les écrans,
// pour que tous les styles de l'app soient créés avec les bonnes couleurs.
import { useEffect, useState, type ComponentType } from "react";
import { View } from "react-native";
import { loadTone } from "./appearance";
import { applyTone, colors } from "./theme";

export default function Boot() {
  const [App, setApp] = useState<ComponentType | null>(null);
  useEffect(() => {
    void loadTone().then((t) => {
      applyTone(t);
      // Chargé seulement maintenant : les écrans lisent les couleurs du ton choisi.
      const { App: Root } = require("expo-router/build/qualified-entry");
      setApp(() => Root);
    });
  }, []);
  if (!App) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return <App />;
}
