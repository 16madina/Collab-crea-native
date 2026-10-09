// Écran affiché à un invité sur une section réservée aux membres.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlossCard, GoldButton, GoldText, goldBorder } from "../lux";
import { colors, fonts } from "../theme";

export function GuestGate({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 40 }]}>
      <Animated.View entering={FadeInDown.springify()}>
        <GlossCard gold style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={icon} size={30} color={colors.primary} />
          </View>
          <GoldText style={styles.title}>{title}</GoldText>
          <Text style={styles.text}>{text}</Text>
          <GoldButton label="Créer mon compte" size="lg" onPress={() => router.push("/auth/signup")} style={{ alignSelf: "stretch", marginTop: 8 }} />
          <Text style={styles.login} onPress={() => router.push("/auth/login")}>
            Déjà membre ? <Text style={{ color: colors.primary, fontWeight: "700" }}>Se connecter</Text>
          </Text>
        </GlossCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, justifyContent: "center", paddingBottom: 140 },
  card: { padding: 26, alignItems: "center", gap: 12 },
  icon: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: goldBorder, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(216,173,106,0.06)" },
  title: { fontFamily: fonts.serif, fontSize: 26, textAlign: "center" },
  text: { color: colors.inkSoft, fontSize: 15, lineHeight: 22, textAlign: "center" },
  login: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
