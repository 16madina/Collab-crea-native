// Après « Je suis créateur / Je suis une marque » : connexion Google / Apple, création de compte ou connexion.
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { toast } from "../../src/kit";
import { GoldButton, goldBorder } from "../../src/lux";
import { useDB } from "../../src/store";
import { colors, radius } from "../../src/theme";
import type { Role } from "../../src/types";
import { Press } from "../../src/ui";

export default function Welcome() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === "brand" ? "brand" : "creator";
  const socialSignIn = useDB((s) => s.socialSignIn);
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [apple, setApple] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") void AppleAuthentication.isAvailableAsync().then(setApple);
  }, []);

  const social = async (p: "google" | "apple") => {
    if (busy) return;
    setBusy(p);
    const r = await socialSignIn(p, role);
    setBusy(null);
    if (!r.ok) return r.cancelled ? undefined : toast(r.error || "Connexion impossible", "error");
    toast(r.isNew ? "Bienvenue sur Collab Créa ! Complète ton profil." : "Bon retour parmi nous !");
    router.replace(r.isNew ? "/(tabs)/profile" : "/(tabs)/home");
  };

  return (
    <AuthShell
      eyebrow={role === "brand" ? "ESPACE MARQUE" : "ESPACE CRÉATEUR"}
      title="Bienvenue"
      subtitle={role === "brand" ? "Trouve les créateurs idéaux pour ta marque." : "Collabore avec des marques et fais grandir ton audience."}
    >
      <Animated.View entering={FadeInDown.delay(80).springify()} style={{ gap: 12 }}>
        {apple ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={28}
            style={{ height: 54 }}
            onPress={() => social("apple")}
          />
        ) : null}
        <Press onPress={() => social("google")} style={styles.google} scaleTo={0.97}>
          {busy === "google" ? <ActivityIndicator color="#111" /> : <Ionicons name="logo-google" size={20} color="#111" />}
          <Text style={styles.googleText}>Continuer avec Google</Text>
        </Press>
        {busy === "apple" ? <ActivityIndicator color={colors.primary} /> : null}
      </Animated.View>

      <View style={styles.or}>
        <View style={styles.line} />
        <Text style={styles.orText}>ou avec ton email</Text>
        <View style={styles.line} />
      </View>

      <Animated.View entering={FadeInDown.delay(160).springify()} style={{ gap: 12 }}>
        <GoldButton label="Créer un compte" size="lg" onPress={() => router.push(`/auth/signup?role=${role}`)} style={{ alignSelf: "stretch" }} />
        <Press onPress={() => router.push("/auth/login")} style={styles.login} scaleTo={0.97}>
          <Text style={styles.loginText}>J'ai déjà un compte · Se connecter</Text>
        </Press>
      </Animated.View>

      <Text style={styles.legal}>En continuant, tu acceptes les Conditions générales d'utilisation et la Politique de confidentialité de Collab Créa.</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  google: { height: 54, borderRadius: 28, backgroundColor: "#F8F6F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  googleText: { color: "#111", fontSize: 15, fontWeight: "700" },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: goldBorder },
  orText: { color: colors.inkSoft, fontSize: 12 },
  login: { height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, alignItems: "center", justifyContent: "center" },
  loginText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  legal: { color: colors.muted, fontSize: 10, textAlign: "center", lineHeight: 14, marginTop: 8 },
});
