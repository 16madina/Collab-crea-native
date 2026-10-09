import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ALL_PLATFORMS, PLATFORM } from "../../src/components/account/constants";
import { Badge, Banner, Card, Screen, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, type } from "../../src/theme";
import { Profile, SocialPlatform } from "../../src/types";
import { Button, Press } from "../../src/ui";

export default function EditSocials() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  if (!me) return <Redirect href="/" />;
  return <Editor me={me} />;
}

function Editor({ me }: { me: Profile }) {
  const updateProfile = useDB((s) => s.updateProfile);
  const socialVerifications = useDB((s) => s.socialVerifications);
  const [values, setValues] = useState<Partial<Record<SocialPlatform, string>>>(me.followers);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);

  const status = useMemo(() => {
    const m: Partial<Record<SocialPlatform, "verified" | "pending_admin" | "rejected">> = {};
    socialVerifications.filter((v) => v.user_id === me.user_id).forEach((v) => (m[v.platform] ??= v.status));
    return m;
  }, [socialVerifications, me.user_id]);

  const connect = (p: SocialPlatform) => {
    setConnecting(p);
    setTimeout(() => {
      const n = p === "tiktok" ? 50000 + Math.round(Math.random() * 150000) : 5000 + Math.round(Math.random() * 40000);
      const label = n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n);
      setValues((v) => ({ ...v, [p]: label }));
      updateProfile({ followers: { ...useDB.getState().profiles.find((x) => x.user_id === me.user_id)!.followers, [p]: label } });
      setConnecting(null);
      toast(`${PLATFORM[p].label} connecté ! ${n.toLocaleString("fr-FR")} abonnés synchronisés.`);
    }, 1800);
  };

  const save = () => {
    const clean: Partial<Record<SocialPlatform, string>> = {};
    (Object.keys(values) as SocialPlatform[]).forEach((k) => {
      const v = values[k]?.trim();
      if (v !== undefined) clean[k] = v;
    });
    updateProfile({ followers: clean });
    toast("Réseaux mis à jour");
    router.back();
  };

  return (
    <Screen title="Mes réseaux sociaux" subtitle="Abonnés et vérification" footer={<Button label="Enregistrer" icon="checkmark" style={{ flex: 1 }} onPress={save} />}>
      <Banner tone="info" icon="sparkles-outline">
        Les profils avec des réseaux vérifiés reçoivent jusqu'à 3x plus de propositions.
      </Banner>
      {ALL_PLATFORMS.map((p, i) => {
        const meta = PLATFORM[p];
        const active = p in values;
        const st = status[p];
        const canOauth = p === "tiktok" || p === "youtube";
        return (
          <Animated.View key={p} entering={FadeInDown.delay(i * 60).springify()}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.icon, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon} size={20} color="#fff" />
                </View>
                <Text style={[type.h3, { flex: 1 }]}>{meta.label}</Text>
                {st === "verified" ? <Badge label="✓ Vérifié" tone="success" /> : st === "pending_admin" ? <Badge label="En attente" tone="warning" /> : st === "rejected" ? <Badge label="Refusé" tone="danger" /> : active ? <Badge label="Non vérifié" tone="muted" /> : null}
              </View>
              {active ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <TextInput
                      value={values[p] ?? ""}
                      onChangeText={(t) => setValues({ ...values, [p]: t })}
                      placeholder="Ex : 48.2K, 1.2M ou 12000"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      editable={st !== "verified"}
                    />
                    <Press
                      onPress={() => {
                        const v = { ...values };
                        delete v[p];
                        setValues(v);
                      }}
                      style={styles.remove}
                    >
                      <Ionicons name="close" size={18} color={colors.muted} />
                    </Press>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {st !== "verified" && st !== "pending_admin" ? (
                      <Button label="Vérifier" small variant="ghost" icon="shield-checkmark-outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/verification/social", params: { platform: p } })} />
                    ) : null}
                    {canOauth ? (
                      connecting === p ? (
                        <View style={[styles.oauth, { flex: 1 }]}>
                          <ActivityIndicator color="#fff" />
                          <Text style={{ color: "#fff", fontWeight: "700" }}>Connexion…</Text>
                        </View>
                      ) : (
                        <Button label={`Connecter ${meta.label}`} small variant="dark" icon="link-outline" style={{ flex: 1 }} onPress={() => (connecting ? undefined : connect(p))} />
                      )
                    ) : null}
                  </View>
                </>
              ) : (
                <Press onPress={() => setValues({ ...values, [p]: "" })} style={styles.add}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>Ajouter {meta.label}</Text>
                </Press>
              )}
            </Card>
          </Animated.View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, height: 48, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, fontSize: 15, color: colors.ink },
  remove: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: radius.pill, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary },
  oauth: { height: 40, borderRadius: radius.pill, backgroundColor: colors.night, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
