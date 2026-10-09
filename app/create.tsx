import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow, type } from "../src/theme";
import { IconButton, Press } from "../src/ui";

const actions = [
  { icon: "images-outline", title: "Ajouter au portfolio", sub: "Photos, vidéos, liens TikTok ou Instagram", color: "#FF5A36" },
  { icon: "paper-plane-outline", title: "Proposer une collab", sub: "Envoyez une idée directement à une marque", color: "#2F6BFF" },
  { icon: "document-text-outline", title: "Générer mon kit média", sub: "Vos statistiques en une page partageable", color: "#1FA463" },
  { icon: "megaphone-outline", title: "Publier une campagne", sub: "Espace marque — trouvez vos créateurs", color: "#141414" },
] as const;

export default function Create() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
      <View style={styles.grabber} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={type.h1}>Créer</Text>
        <IconButton name="close" onPress={() => router.back()} />
      </View>
      <Text style={[type.body, { marginBottom: 20 }]}>Que voulez-vous faire aujourd'hui ?</Text>
      <View style={{ gap: 12 }}>
        {actions.map((a, i) => (
          <Animated.View key={a.title} entering={FadeInDown.delay(60 + i * 70).springify()}>
            <Press style={[styles.row, shadow.soft]} scaleTo={0.97} onPress={() => router.back()}>
              <View style={[styles.icon, { backgroundColor: a.color }]}>
                <Ionicons name={a.icon} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{a.title}</Text>
                <Text style={type.small}>{a.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Press>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, padding: 16, borderRadius: radius.lg },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
