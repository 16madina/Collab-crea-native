// Création du second espace (Marque ou Créateur) d'un compte.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { CreateSpaceSheet } from "../../src/components/SpaceSwitcher";
import { colors } from "../../src/theme";

export default function NewSpace() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CreateSpaceSheet visible onClose={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))} role={role === "creator" ? "creator" : "brand"} />
    </View>
  );
}
