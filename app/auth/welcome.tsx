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

  const locked = !terms;
  const needTerms = () => {
    setTermsErr(true);
    toast("Accepte les conditions pour continuer", "error");
  };
  const go = (path: string) => (locked ? needTerms() : router.push(path as never));

  const social = async (p: "google" | "apple") => {
    if (busy) return;
    if (locked) return needTerms();
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
      <View style={[styles.terms, terms && { borderColor: colors.primary }]}>
        <Checkbox value={terms} onChange={(v: boolean) => { setTerms(v); setTermsErr(false); }}>
          <Text style={[styles.legal, termsErr && !terms && { color: "#E5484D" }]}>
            J'accepte les{" "}
            <Text style={styles.link} onPress={() => router.push("/legal/terms")}>Conditions générales d'utilisation</Text> et la{" "}
            <Text style={styles.link} onPress={() => router.push("/legal/privacy")}>Politique de confidentialité</Text>.
          </Text>
        </Checkbox>
      </View>

      <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.row}>
        <Press onPress={() => social("google")} style={[styles.social, locked && styles.off]} scaleTo={0.97}>
          {busy === "google" ? <ActivityIndicator color="#111" /> : <Ionicons name="logo-google" size={18} color={locked ? "#8a8a8a" : "#111"} />}
          <Text style={[styles.socialText, locked && styles.offText]}>Google</Text>
        </Press>
        {Platform.OS !== "android" ? (
          <Press onPress={() => social("apple")} style={[styles.social, styles.apple, locked && styles.off]} scaleTo={0.97}>
            {busy === "apple" ? <ActivityIndicator color="#fff" /> : <Ionicons name="logo-apple" size={20} color={locked ? "#8a8a8a" : "#fff"} />}
            <Text style={[styles.socialText, { color: "#fff" }, locked && styles.offText]}>Apple</Text>
          </Press>
        ) : null}
      </Animated.View>

      <View style={styles.or}>
        <View style={styles.line} />
        <Text style={styles.orText}>ou avec ton email</Text>
        <View style={styles.line} />
      </View>

      <Animated.View entering={FadeInDown.delay(160).duration(320)} style={{ gap: 12 }}>
        {locked ? (
          <Press onPress={needTerms} style={[styles.login, styles.off]} scaleTo={0.97}>
            <Text style={[styles.loginText, styles.offText]}>Créer un compte</Text>
          </Press>
        ) : (
          <GoldButton label="Créer un compte" size="lg" onPress={() => go(`/auth/signup?role=${role}&terms=1`)} style={{ alignSelf: "stretch" }} />
        )}
        <Press onPress={() => go("/auth/login")} style={[styles.login, locked && styles.off]} scaleTo={0.97}>
          <Text style={[styles.loginText, locked && styles.offText]}>J'ai déjà un compte · Se connecter</Text>
        </Press>
      </Animated.View>

    </AuthShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  off: { backgroundColor: "#2a2a2a", borderColor: "#2a2a2a", borderWidth: 1 },
  offText: { color: "#8a8a8a" },
  terms: { padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: goldBorder, marginBottom: 4 },
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
