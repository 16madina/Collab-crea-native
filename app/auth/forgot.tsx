import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { isEmail } from "../../src/components/account/constants";
import { Field } from "../../src/kit";
import { colors, type } from "../../src/theme";
import { Button } from "../../src/ui";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!isEmail(email)) return setErr("Email invalide");
    setErr(undefined);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 700);
  };

  if (sent)
    return (
      <AuthShell title="Email envoyé" subtitle={`Si un compte existe pour ${email.trim()}, vous recevrez un lien pour réinitialiser votre mot de passe.`}>
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center", marginVertical: 20 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="mail-open-outline" size={44} color={colors.primary} />
          </View>
        </Animated.View>
        <Text style={[type.small, { textAlign: "center" }]}>Pensez à vérifier vos spams.</Text>
        <Button label="Ouvrir le lien (démo)" icon="key-outline" onPress={() => router.push("/auth/reset")} />
        <Button label="Retour à la connexion" variant="outline" icon={null} onPress={() => router.replace("/auth/login")} />
        <Text style={[type.small, { textAlign: "center", color: colors.primary, fontWeight: "700" }]} onPress={() => setSent(false)}>
          Renvoyer l'email
        </Text>
      </AuthShell>
    );

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Entrez votre email, nous vous enverrons un lien de réinitialisation.">
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="vous@exemple.com" error={err} />
        <Button label={loading ? "Envoi…" : "Envoyer le lien"} icon="send-outline" onPress={loading ? undefined : submit} />
      </Animated.View>
    </AuthShell>
  );
}
