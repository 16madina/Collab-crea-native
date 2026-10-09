import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMe } from "../src/store";
import { colors, radius, shadow, type } from "../src/theme";
import { IconButton, Press } from "../src/ui";

type Action = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; color: string; to: string; tab?: boolean };

const BRAND: Action[] = [
  { icon: "megaphone-outline", title: "Publier une offre", sub: "Décrivez votre campagne et recevez des candidatures", color: "#FF5A36", to: "/offer/edit" },
  { icon: "people-outline", title: "Trouver des créateurs", sub: "Parcourez la marketplace et proposez vos offres", color: "#141414", to: "/marketplace" },
];
const CREATOR: Action[] = [
  { icon: "compass-outline", title: "Explorer les offres", sub: "Trouvez des campagnes adaptées à votre audience", color: "#FF5A36", to: "/(tabs)/offers?tab=offers", tab: true },
  { icon: "images-outline", title: "Ajouter au portfolio", sub: "Photos, vidéos, liens TikTok ou Instagram", color: "#2F6BFF", to: "/edit/portfolio" },
  { icon: "shield-checkmark-outline", title: "Vérifier un réseau", sub: "Certifiez vos abonnés pour rassurer les marques", color: "#1FA463", to: "/verification/social" },
  { icon: "wallet-outline", title: "Mon portefeuille", sub: "Solde, retraits et historique", color: "#141414", to: "/wallet" },
];

export default function Create() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const actions = me?.role === "brand" ? BRAND : CREATOR;
  const go = (a: Action) => {
    router.back();
    setTimeout(() => (a.tab ? router.navigate(a.to as never) : router.push(a.to as never)), 60);
  };
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
            <Press style={[styles.row, shadow.soft]} scaleTo={0.97} onPress={() => go(a)}>
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
