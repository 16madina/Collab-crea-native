import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Button } from "../../src/ui";

export default function Invite() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const claimInvite = useDB((s) => s.claimInvite);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string>();
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const onChange = (t: string) => {
    let v = t.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (v.length > 6 && !v.startsWith("COLLAB-")) v = "COLLAB-" + v.replace(/^COLLAB-?/, "").replace(/-/g, "");
    setCode(v.slice(0, 11));
    setErr(undefined);
  };

  const submit = () => {
    const r = claimInvite(code);
    if (!r.ok) {
      setErr(r.error);
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
      return;
    }
    toast("Code validé, bienvenue !");
    router.replace({ pathname: "/auth/signup", params: { code: code.trim().toUpperCase(), ...(role ? { role } : {}) } });
  };

  return (
    <AuthShell
      eyebrow="ACCÈS PRIVÉ"
      title="Collab Créa est sur invitation"
      subtitle="Nous ouvrons la plateforme progressivement. Entrez votre code d'invitation pour créer votre compte."
      top={
        <Animated.View entering={ZoomIn.springify()} style={{ alignSelf: "center", marginTop: 10 }}>
          <View style={[{ width: 92, height: 92, borderRadius: 30, backgroundColor: colors.night, alignItems: "center", justifyContent: "center" }, shadow.soft]}>
            <Ionicons name="lock-closed" size={40} color={colors.primary} />
          </View>
        </Animated.View>
      }
    >
      <Animated.View entering={FadeInDown.delay(120).springify()} style={[{ gap: 8 }, shakeStyle]}>
        <TextInput
          value={code}
          onChangeText={onChange}
          placeholder="COLLAB-XXXX"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            borderWidth: 2,
            borderColor: err ? "#E5484D" : code.length === 11 ? colors.primary : colors.line,
            textAlign: "center",
            fontSize: 24,
            fontWeight: "800",
            letterSpacing: 3,
            color: colors.ink,
          }}
        />
        {err ? <Text style={{ color: "#E5484D", fontWeight: "600", textAlign: "center" }}>{err}</Text> : null}
      </Animated.View>
      <Button label="Valider mon code" onPress={submit} />
      <Text style={[type.small, { textAlign: "center" }]}>
        Pas de code ? Demandez-en un à un membre ou écrivez-nous via{" "}
        <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => router.push("/contact")}>
          Contact
        </Text>
        .
      </Text>
      <Text style={[type.small, { textAlign: "center" }]}>
        Déjà membre ?{" "}
        <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => router.replace("/auth/login")}>
          Se connecter
        </Text>
      </Text>
    </AuthShell>
  );
}
