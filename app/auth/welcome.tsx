// Après « Je suis créateur / Je suis une marque » : connexion Google / Apple, création de compte ou connexion.
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { Checkbox } from "../../src/components/account/widgets";
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
  const [terms, setTerms] = useState(false);
  const [termsErr, setTermsErr] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") void AppleAuthentication.isAvailableAsync().then(setApple);
  }, []);

  const social = async (p: "google" | "apple") => {
    if (busy) return;
    if (!terms) {
      setTermsErr(true);
      return toast("Accepte les conditions pour continuer", "error");
    }
    if (p === "apple" && !apple) return toast("Connexion Apple disponible sur iPhone", "error");
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
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.row}>
        <Press onPress={() => social("google")} style={styles.social} scaleTo={0.97}>
          {busy === "google" ? <ActivityIndicator color="#111" /> : <Ionicons name="logo-google" size={18} color="#111" />}
          <Text style={styles.socialText}>Google</Text>
        </Press>
        {Platform.OS !== "android" ? (
          <Press onPress={() => social("apple")} style={[styles.social, styles.apple]} scaleTo={0.97}>
            {busy === "apple" ? <ActivityIndicator color="#fff" /> : <Ionicons name="logo-apple" size={20} color="#fff" />}
            <Text style={[styles.socialText, { color: "#fff" }]}>Apple</Text>
          </Press>
        ) : null}
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

      <View style={{ marginTop: 6 }}>
        <Checkbox value={terms} onChange={(v: boolean) => { setTerms(v); setTermsErr(false); }}>
          <Text style={[styles.legal, termsErr && !terms && { color: "#E5484D" }]}>
            J'accepte les{" "}
            <Text style={styles.link} onPress={() => router.push("/legal/terms")}>Conditions générales d'utilisation</Text> et la{" "}
            <Text style={styles.link} onPress={() => router.push("/legal/privacy")}>Politique de confidentialité</Text>.
          </Text>
        </Checkbox>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  social: { flex: 1, height: 52, borderRadius: 26, backgroundColor: "#F8F6F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  apple: { backgroundColor: "#000", borderWidth: 1, borderColor: "#3a3a3a" },
  socialText: { color: "#111", fontSize: 15, fontWeight: "700" },
  link: { color: colors.primary, fontWeight: "700" },
  or: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: goldBorder },
  orText: { color: colors.inkSoft, fontSize: 12 },
  login: { height: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, alignItems: "center", justifyContent: "center" },
  loginText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  legal: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
});
