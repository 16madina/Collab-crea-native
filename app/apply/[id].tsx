// Formulaire « Postuler à cette offre » (créateur).
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nameOf } from "../../src/components/collab/common";
import { initials } from "../../src/components/home/CreatorTile";
import { logoOf } from "../../src/components/offers/OfferCards";
import { Empty, fmtDate, toast } from "../../src/kit";
import { GlossFill, GoldButton, goldBorder, goldBorderStrong } from "../../src/lux";
import { budgetLabel, useDB, useMe } from "../../src/store";
import { colors, fonts, radius } from "../../src/theme";
import type { Slot } from "../../src/types";
import { Button, Press } from "../../src/ui";

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const offer = useDB((s) => s.offers.find((o) => o.id === id));
  const brand = useDB((s) => s.profiles.find((p) => p.user_id === offer?.brand_id));
  const applyToOffer = useDB((s) => s.applyToOffer);

  const [msg, setMsg] = useState("");
  const [notes, setNotes] = useState("");
  const [slot, setSlot] = useState<Slot | undefined>();

  if (!offer || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 20 }}>
        <Empty icon="alert-circle-outline" title="Offre introuvable" action={<Button label="Retour" small onPress={() => router.back()} icon={null} />} />
      </View>
    );
  }

  const send = () => {
    if (!msg.trim()) return toast("Écris ta proposition", "error");
    const r = applyToOffer(offer.id, msg.trim(), slot, { notes: notes.trim() || undefined });
    if (!r.ok) return toast(r.error, "error");
    toast("Candidature envoyée !");
    router.replace(`/offer/${offer.id}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#050505" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Press onPress={() => router.back()} style={styles.back} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={24} color="#F8F6F2" />
        </Press>
        <Text style={styles.headerTitle}>Postuler à cette offre</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.summary}>
          {offer.images[0] != null ? <Image source={offer.images[0]} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} contentFit="cover" /> : <GlossFill />}
          <LinearGradient colors={["#050505", "rgba(5,5,5,0.75)", "rgba(5,5,5,0.4)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <View style={styles.sumLogo}>
            <Text style={styles.sumLogoText}>{initials(nameOf(brand))}</Text>
            <Image source={logoOf(offer, brand)} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.sumTitle} numberOfLines={2}>{offer.title}</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{offer.category}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text style={styles.sumBudget}>{budgetLabel(offer)}</Text>
              {offer.deadline ? <Text style={styles.hint}>Jusqu'au {fmtDate(offer.deadline, true)}</Text> : null}
            </View>
          </View>
        </Animated.View>

        {!me.identity_verified ? (
          <Press onPress={() => router.push("/verification/identity")} style={styles.warn}>
            <Ionicons name="shield-outline" size={18} color={colors.warning} />
            <Text style={[styles.hint, { flex: 1, color: "#F3D49B" }]}>Vérifie ton identité pour pouvoir envoyer ta candidature. Appuie ici.</Text>
          </Press>
        ) : null}

        {offer.on_site_slots.length ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.h}>Choisis un créneau *</Text>
            {offer.on_site_slots.map((s, i) => {
              const on = slot === s;
              return (
                <Press key={i} onPress={() => setSlot(s)} style={[styles.slot, on && { borderColor: "#D9AC65", backgroundColor: "rgba(217,172,101,0.08)" }]} scaleTo={0.98}>
                  <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.primary : colors.muted} />
                  <Text style={styles.input}>
                    {fmtDate(s.date, true)} · {s.start_time}–{s.end_time}
                  </Text>
                </Press>
              );
            })}
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={styles.h}>Ta proposition</Text>
          <Text style={styles.sub}>Présente ta vision et comment tu comptes réaliser cette collaboration.</Text>
          <View style={styles.area}>
            <TextInput value={msg} onChangeText={(t) => setMsg(t.slice(0, 1000))} multiline placeholder="Écris ta proposition ici…" placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 96 }]} />
            <Text style={styles.counter}>{msg.length}/1000</Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={styles.h}>Informations supplémentaires</Text>
          <Text style={styles.sub}>As-tu des questions ou des idées particulières ? (facultatif)</Text>
          <View style={styles.area}>
            <TextInput value={notes} onChangeText={(t) => setNotes(t.slice(0, 500))} multiline placeholder="Écris ici…" placeholderTextColor={colors.muted} style={[styles.input, { minHeight: 70 }]} />
            <Text style={styles.counter}>{notes.length}/500</Text>
          </View>
        </View>

        <GoldButton label="Envoyer ma candidature" size="lg" onPress={send} style={{ alignSelf: "stretch", marginTop: 4 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Ionicons name="information-circle" size={16} color={colors.inkSoft} />
          <Text style={[styles.hint, { flex: 1 }]}>Une fois envoyée, ta candidature sera visible par la marque. Tu seras notifié si elle t'accepte.</Text>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.serif, color: "#F8F6F2", fontSize: 19 },
  summary: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0F0F0F" },
  sumLogo: { width: 72, height: 72, borderRadius: 36, overflow: "hidden", backgroundColor: "#050505", borderWidth: 1, borderColor: "#D9AC65", alignItems: "center", justifyContent: "center" },
  sumLogoText: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 20 },
  sumTitle: { fontFamily: fonts.serif, color: "#F8F6F2", fontSize: 16, lineHeight: 20 },
  sumBudget: { color: "#E7BE78", fontSize: 13, fontWeight: "800" },
  chip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "#171717", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  chipText: { color: "#F8F6F2", fontSize: 10, fontWeight: "600" },
  warn: { flexDirection: "row", gap: 10, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(243,212,155,0.35)", backgroundColor: "rgba(217,172,101,0.08)" },
  h: { color: "#F8F6F2", fontSize: 14, fontWeight: "700" },
  opt: { color: colors.inkSoft, fontWeight: "500" },
  sub: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  hint: { color: colors.inkSoft, fontSize: 11, lineHeight: 15 },
  area: { borderRadius: 14, borderWidth: 1, borderColor: goldBorder, backgroundColor: "#0F0F0F", padding: 12, marginTop: 4 },
  input: { color: "#F8F6F2", fontSize: 13, textAlignVertical: "top", flex: 1 },
  counter: { color: colors.muted, fontSize: 10, alignSelf: "flex-end", marginTop: 4 },
  ex: { width: 76, height: 100, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  exAdd: { borderStyle: "dashed", borderColor: "rgba(248,246,242,0.25)", alignItems: "center", justifyContent: "center", gap: 4, padding: 6, backgroundColor: "#0F0F0F" },
  exDel: { position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  netIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: goldBorder, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0F0F" },
  link: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: goldBorder, backgroundColor: "#0F0F0F", paddingHorizontal: 12, textAlignVertical: "center" },
  slot: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: goldBorder, backgroundColor: "#0F0F0F" },
  pick: { width: 96, height: 120, borderRadius: 12, overflow: "hidden" },
});
