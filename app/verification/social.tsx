import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import { ALL_PLATFORMS, PLATFORM, SAMPLE_MEDIA } from "../../src/components/account/constants";
import { Banner, Card, Empty, Field, Label, Screen, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, type } from "../../src/theme";
import { SocialPlatform, SocialVerification } from "../../src/types";
import { Button, Press } from "../../src/ui";

type Phase = "form" | "extracting" | "uploading" | "analyzing" | "result";
const PHASE_LABEL: Record<"extracting" | "uploading" | "analyzing", [string, keyof typeof Ionicons.glyphMap]> = {
  extracting: ["Lecture de la capture…", "scan-outline"],
  uploading: ["Envoi sécurisé…", "cloud-upload-outline"],
  analyzing: ["Analyse IA des abonnés…", "sparkles-outline"],
};

export default function SocialVerificationScreen() {
  const params = useLocalSearchParams<{ platform?: string }>();
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const submit = useDB((s) => s.submitSocialVerification);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);

  const [platform, setPlatform] = useState<SocialPlatform>(ALL_PLATFORMS.includes(params.platform as SocialPlatform) ? (params.platform as SocialPlatform) : "instagram");
  const [page, setPage] = useState("");
  const [claimed, setClaimed] = useState(me?.followers[platform] ?? "");
  const [shot, setShot] = useState<string>();
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<SocialVerification>();

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 1200 }), -1);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  if (!me) return <Redirect href="/" />;

  if (!me.identity_verified)
    return (
      <Screen title="Vérifier un réseau">
        <Empty
          icon="shield-outline"
          title="Identité requise"
          text="Vous devez d'abord faire vérifier votre identité avant de certifier vos réseaux sociaux."
          action={<Button label="Vérifier mon identité" small icon="shield-checkmark-outline" onPress={() => router.replace("/verification/identity")} />}
        />
      </Screen>
    );

  const start = () => {
    if (page.trim().length < 2) return toast("Indiquez le nom de la page", "error");
    if (!/^\d+([.,]\d+)?\s*[kKmM]?$/.test(claimed.trim())) return toast("Nombre d'abonnés invalide (ex : 48.2K)", "error");
    if (!shot) return toast("Ajoutez une capture d'écran de votre profil", "error");
    setPhase("extracting");
    setTimeout(() => setPhase("uploading"), 1100);
    setTimeout(() => setPhase("analyzing"), 2200);
    setTimeout(() => {
      const r = submit({ platform, page_name: page.trim(), claimed_followers: claimed.trim().toUpperCase().replace(",", ".") });
      setResult(r);
      setPhase("result");
    }, 3800);
  };

  if (phase !== "form" && phase !== "result") {
    const [label, icon] = PHASE_LABEL[phase];
    const order = ["extracting", "uploading", "analyzing"];
    return (
      <Screen title="Vérification en cours" back={false}>
        <View style={{ alignItems: "center", gap: 20, marginTop: 40 }}>
          <View style={styles.loaderWrap}>
            <Animated.View style={[styles.loaderRing, spinStyle]} />
            <Animated.View key={phase} entering={ZoomIn.springify()}>
              <Ionicons name={icon} size={44} color={colors.primary} />
            </Animated.View>
          </View>
          <Animated.Text key={`l${phase}`} entering={FadeInDown.springify()} style={type.h2}>
            {label}
          </Animated.Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {order.map((p, i) => (
              <View key={p} style={{ width: 40, height: 6, borderRadius: 3, backgroundColor: order.indexOf(phase) >= i ? colors.primary : colors.line }} />
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === "result" && result) {
    const ok = result.status === "verified";
    const pending = result.status === "pending_admin";
    return (
      <Screen title="Résultat">
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: ok ? "#DDF5E8" : pending ? "#FFF3D6" : "#FDE7E7" }]}>
            <Ionicons name={ok ? "checkmark-circle" : pending ? "time-outline" : "close-circle"} size={56} color={ok ? colors.success : pending ? "#B7791F" : "#C53030"} />
          </View>
          <Text style={[type.h1, { textAlign: "center" }]}>{ok ? `✅ Vérifié ! ${result.ai_extracted_followers} abonnés détectés` : pending ? "En attente de validation" : "Vérification refusée"}</Text>
          <Text style={[type.body, { textAlign: "center" }]}>
            {ok
              ? `Votre compte ${PLATFORM[result.platform].label} est certifié et vos abonnés ont été mis à jour.`
              : pending
                ? `L'analyse automatique n'est pas concluante (confiance ${result.ai_confidence} %). Un administrateur va vérifier votre capture sous 24–48 h.`
                : "La capture ne correspond pas aux informations fournies. Réessayez avec une capture nette de votre profil."}
          </Text>
        </Animated.View>
        <Card>
          <Text style={type.tiny}>DÉTAILS</Text>
          <Text style={type.small}>Page : {result.page_name}</Text>
          <Text style={type.small}>Abonnés revendiqués : {result.claimed_followers}</Text>
          {result.ai_confidence != null ? <Text style={type.small}>Confiance IA : {result.ai_confidence} %</Text> : null}
        </Card>
        <Button label="Terminé" icon="checkmark" onPress={() => router.back()} />
        {!ok && !pending ? <Button label="Réessayer" variant="outline" icon="refresh" onPress={() => setPhase("form")} /> : null}
      </Screen>
    );
  }

  return (
    <Screen title="Vérifier un réseau" subtitle="Certification des abonnés" footer={<Button label="Lancer la vérification" icon="shield-checkmark-outline" style={{ flex: 1 }} onPress={start} />}>
      <Banner tone="info" icon="sparkles-outline">
        Notre IA lit votre capture d'écran pour confirmer le nombre d'abonnés. Si le résultat est incertain, un administrateur valide manuellement.
      </Banner>
      <Label>Plateforme</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ALL_PLATFORMS.map((p) => {
          const on = p === platform;
          return (
            <Press
              key={p}
              onPress={() => {
                setPlatform(p);
                setClaimed(me.followers[p] ?? "");
              }}
              scaleTo={0.94}
              style={[styles.chip, on && { backgroundColor: PLATFORM[p].color, borderColor: PLATFORM[p].color }]}
            >
              <Ionicons name={PLATFORM[p].icon} size={16} color={on ? "#fff" : PLATFORM[p].color} />
              <Text style={{ fontWeight: "700", color: on ? "#fff" : colors.ink }}>{PLATFORM[p].label}</Text>
            </Press>
          );
        })}
      </View>
      <Field label="Nom de la page" value={page} onChangeText={setPage} autoCapitalize="none" placeholder="@moncompte" />
      <Field label="Abonnés revendiqués" value={claimed} onChangeText={setClaimed} placeholder="48.2K" hint="Formats acceptés : 12000, 48.2K, 1.2M" />
      <Label>Capture d'écran du profil</Label>
      <Press onPress={() => setShot(SAMPLE_MEDIA[Math.floor(Math.random() * SAMPLE_MEDIA.length)])} scaleTo={0.98} style={[styles.drop, shot && { borderStyle: "solid", padding: 0, overflow: "hidden" }]}>
        {shot ? (
          <Animated.View entering={FadeIn} style={{ width: "100%", height: 200 }}>
            <Image source={shot} style={{ flex: 1 }} contentFit="cover" />
            <View style={styles.replace}>
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Remplacer</Text>
            </View>
          </Animated.View>
        ) : (
          <>
            <Ionicons name="image-outline" size={34} color={colors.primary} />
            <Text style={type.h3}>Ajouter une capture</Text>
            <Text style={[type.small, { textAlign: "center" }]}>Le nom de la page et le nombre d'abonnés doivent être lisibles.</Text>
          </>
        )}
      </Press>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  drop: { alignItems: "center", gap: 6, padding: 24, borderRadius: radius.lg, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, backgroundColor: colors.surface },
  replace: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  loaderWrap: { width: 130, height: 130, alignItems: "center", justifyContent: "center" },
  loaderRing: { position: "absolute", width: 130, height: 130, borderRadius: 65, borderWidth: 5, borderColor: colors.primarySoft, borderTopColor: colors.primary },
  bigIcon: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
});
