import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { isEmail } from "../../src/components/account/constants";
import { PasswordField } from "../../src/components/account/PasswordField";
import { Field, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, type } from "../../src/theme";
import { Button } from "../../src/ui";

export default function Login() {
  const signIn = useDB((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = () => {
    const e: typeof err = {};
    if (!isEmail(email)) e.email = "Email invalide";
    if (password.length < 6) e.password = "Minimum 6 caractères";
    setErr(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const r = signIn(email.trim().toLowerCase(), password);
      if (!r.ok) return toast(r.error, "error");
      const s = useDB.getState();
      const role = s.profiles.find((p) => p.user_id === s.userId)?.role;
      toast("Bon retour parmi nous !");
      router.replace(role === "admin" ? "/admin" : "/(tabs)/home");
    }, 500);
  };

  return (
    <AuthShell title="Se connecter" subtitle="Heureux de vous revoir. Connectez-vous pour retrouver vos collaborations.">
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="vous@exemple.com" error={err.email} />
        <PasswordField label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••" error={err.password} />
        <Text onPress={() => router.push("/auth/forgot")} style={{ alignSelf: "flex-end", color: colors.primary, fontWeight: "700" }}>
          Mot de passe oublié ?
        </Text>
        <Button label={loading ? "Connexion…" : "Se connecter"} onPress={loading ? undefined : submit} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).springify()} style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: colors.line }}>
        <Ionicons name="bulb-outline" size={18} color={colors.primary} />
        <Text style={[type.small, { flex: 1 }]}>
          Astuce démo : un email commençant par <Text style={{ fontWeight: "800", color: colors.ink }}>marque@</Text> ouvre l'espace marque, <Text style={{ fontWeight: "800", color: colors.ink }}>admin@</Text> l'administration.
        </Text>
      </Animated.View>
      <View style={{ alignItems: "center", marginTop: 6 }}>
        <Text style={type.small}>
          Pas encore de compte ?{" "}
          <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => router.replace("/auth/signup")}>
            Créer un compte
          </Text>
        </Text>
      </View>
    </AuthShell>
  );
}
