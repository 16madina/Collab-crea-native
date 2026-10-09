import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Share, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStatusBadge, avatarOf, InfoBox, nameOf } from "../../src/components/collab/common";
import { Sheet } from "../../src/components/collab/Sheet";
import { Banner, Chips, Empty, fmtDate, toast } from "../../src/kit";
import { budgetLabel, useDB, useMe } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import type { Slot } from "../../src/types";
import { Avatar, Button, Glass, IconButton, OFFER_FALLBACK, Press } from "../../src/ui";

const HERO = 360;
const REASONS = ["Offre trompeuse / Fausses informations", "Arnaque ou fraude", "Contenu inapproprié", "Rémunération abusive", "Autre"];

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ gap: 10 }}>
      <Text style={type.h2}>{title}</Text>
      {children}
    </Animated.View>
  );
}

function Line({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={type.tiny}>{label}</Text>
        <Text style={[type.body, { color: colors.ink }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function OfferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const offer = useDB((s) => s.offers.find((o) => o.id === id));
  const brand = useDB((s) => s.profiles.find((p) => p.user_id === offer?.brand_id));
  const applications = useDB((s) => s.applications);
  const profiles = useDB((s) => s.profiles);
  const applyToOffer = useDB((s) => s.applyToOffer);
  const report = useDB((s) => s.report);

  const [slot, setSlot] = useState<Slot | undefined>();
  const [msg, setMsg] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [-200, 0, HERO], [-100, 0, HERO * 0.5]) }, { scale: interpolate(y.value, [-200, 0], [1.5, 1], "clamp") }],
  }));

  const candidates = useMemo(() => applications.filter((a) => a.offer_id === id), [applications, id]);
  const myApp = useMemo(() => applications.find((a) => a.offer_id === id && a.creator_id === me?.user_id), [applications, id, me?.user_id]);

  if (!offer || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 20 }}>
        <Empty icon="alert-circle-outline" title="Offre introuvable" action={<Button label="Retour" small onPress={() => router.back()} icon={null} />} />
      </View>
    );
  }

  const isOwner = offer.brand_id === me.user_id;
  const isCreator = me.role === "creator";
  const brief = offer.creative_brief;
  const hasBrief = !!(brief.phone || brief.address || brief.hashtags || brief.mentions);

  const apply = () => {
    const r = applyToOffer(offer.id, msg, slot);
    if (!r.ok) return toast(r.error, "error");
    setApplyOpen(false);
    toast("Candidature envoyée !");
    if (r.id) router.push(`/chat/${r.id}`);
  };

  const footer = () => {
    if (isOwner)
      return (
        <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
          <Button label="Modifier" variant="outline" icon="create-outline" onPress={() => router.push({ pathname: "/offer/edit", params: { id: offer.id } })} style={{ flex: 1 }} />
          <Button label="Créateurs" icon="people" onPress={() => router.push("/marketplace")} style={{ flex: 1 }} />
        </View>
      );
    if (!isCreator) return <Text style={[type.small, { flex: 1 }]}>Seuls les créateurs peuvent postuler à une offre.</Text>;
    if (myApp && myApp.status !== "rejected")
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <Animated.View entering={ZoomIn.springify()}>
            <AppStatusBadge status={myApp.status} />
          </Animated.View>
          <Button label="Voir la conversation" icon="chatbubble-ellipses" onPress={() => router.push(`/chat/${myApp.conversation_id}`)} style={{ flex: 1 }} />
        </View>
      );
    if (!me.identity_verified)
      return <Button label="Vérifier mon identité" icon="shield-checkmark" onPress={() => router.push("/verification/identity")} style={{ flex: 1 }} />;
    return (
      <>
        <View>
          <Text style={type.tiny}>Rémunération</Text>
          <Text style={[type.h3, { color: colors.primary }]}>{budgetLabel(offer)}</Text>
        </View>
        <Button label={myApp?.status === "rejected" ? "Repostuler" : "Postuler"} onPress={() => setApplyOpen(true)} style={{ flex: 1, marginLeft: 12 }} />
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <Animated.View style={[{ height: HERO }, heroStyle]}>
          <Image source={offer.images[0] ?? OFFER_FALLBACK} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={styles.sheet}>
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <Press onPress={() => brand && router.push(`/profile/${brand.user_id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }} scaleTo={0.98}>
              <Avatar uri={avatarOf(brand)} size={34} />
              <Text style={[type.h3, { flex: 1 }]}>{nameOf(brand)}</Text>
              <View style={styles.pill}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{offer.category}</Text>
              </View>
            </Press>
            <Text style={type.h1}>{offer.title}</Text>
          </Animated.View>

          {isCreator && !me.identity_verified && !isOwner ? (
            <Banner tone="warning" icon="shield-outline">
              <Text style={[type.small, { color: colors.inkSoft }]}>Vérifiez votre identité pour postuler aux offres.</Text>
              <Press onPress={() => router.push("/verification/identity")}>
                <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4 }}>Vérifier mon identité →</Text>
              </Press>
            </Banner>
          ) : null}

          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.infoGrid}>
            {(
              [
                ["cash-outline", "Budget", budgetLabel(offer)],
                ["camera-outline", "Contenu", offer.content_types.join(", ")],
                ["calendar-outline", "Date limite", offer.deadline ? fmtDate(offer.deadline, true) : "Aucune"],
                ["location-outline", "Lieu", offer.location || "Tous les pays africains"],
              ] as const
            ).map(([icon, label, value]) => (
              <View key={label} style={[styles.info, shadow.soft]}>
                <View style={styles.infoIcon}>
                  <Ionicons name={icon} size={18} color={colors.primary} />
                </View>
                <Text style={type.tiny}>{label}</Text>
                <Text style={[type.h3, { fontSize: 14 }]} numberOfLines={2}>
                  {value}
                </Text>
              </View>
            ))}
          </Animated.View>

          <Section title="Description" delay={140}>
            <Text style={type.body}>{offer.description}</Text>
            {offer.expectations ? (
              <>
                <Text style={[type.h3, { marginTop: 6 }]}>Attentes</Text>
                <Text style={type.body}>{offer.expectations}</Text>
              </>
            ) : null}
            {offer.restrictions ? (
              <>
                <Text style={[type.h3, { marginTop: 6 }]}>Restrictions</Text>
                <Text style={type.body}>{offer.restrictions}</Text>
              </>
            ) : null}
          </Section>

          <Section title="Mode de livraison" delay={180}>
            <View style={[styles.box, shadow.soft]}>
              <Text style={type.h3}>{offer.delivery_mode === "network" ? "📱 Publication réseau" : "📦 Livraison privée"}</Text>
              <Text style={type.small}>
                {offer.delivery_mode === "network"
                  ? "Le créateur soumet d'abord un aperçu. Une fois validé, il publie sur ses réseaux puis soumet le lien de publication pour déclencher le paiement."
                  : "Le créateur livre le contenu directement à la marque (fichiers / liens privés). Rien n'est publié sur ses réseaux."}
              </Text>
            </View>
          </Section>

          {offer.presence_mode === "on_site" ? (
            <Section title="📍 Sur place" delay={200}>
              <View style={[styles.box, shadow.soft]}>
                <Line icon="storefront-outline" label="Lieu" value={offer.on_site_store_name} />
                <Line icon="map-outline" label="Quartier" value={offer.on_site_neighborhood} />
                <Line icon="business-outline" label="Ville" value={offer.on_site_city} />
                {offer.filming_by === "brand" ? <InfoBox icon="videocam-outline">Tournage assuré par la marque : vous vous présentez sur place, la marque filme et vous validez le contenu.</InfoBox> : null}
                {offer.on_site_slots.length ? (
                  <View style={{ gap: 6 }}>
                    <Text style={type.tiny}>Créneaux disponibles</Text>
                    {offer.on_site_slots.map((s, i) => (
                      <Text key={i} style={[type.body, { color: colors.ink }]}>
                        📅 {fmtDate(s.date, true)} · {s.start_time}–{s.end_time}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </Section>
          ) : null}

          {hasBrief && (isOwner || isCreator) ? (
            <Section title="Brief créatif" delay={220}>
              <View style={[styles.box, shadow.soft]}>
                <Line icon="call-outline" label="Téléphone" value={brief.phone} />
                <Line icon="home-outline" label="Adresse" value={brief.address} />
                <Line icon="pricetag-outline" label="Hashtags" value={brief.hashtags} />
                <Line icon="at-outline" label="Mentions / textes" value={brief.mentions} />
              </View>
            </Section>
          ) : null}

          <View style={styles.secure}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[type.small, { flex: 1, color: colors.inkSoft }]}>Paiement sécurisé : le budget est bloqué en séquestre par Collab Créa et versé au créateur à la validation.</Text>
          </View>

          {isOwner ? (
            <Section title={`Candidats (${candidates.length})`}>
              {candidates.length === 0 ? (
                <Text style={type.small}>Aucune candidature pour le moment.</Text>
              ) : (
                candidates.map((a) => {
                  const c = profiles.find((p) => p.user_id === a.creator_id);
                  return (
                    <Press key={a.id} onPress={() => router.push(`/chat/${a.conversation_id}`)} style={[styles.cand, shadow.soft]} scaleTo={0.98}>
                      <Avatar uri={avatarOf(c)} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={type.h3}>{nameOf(c)}</Text>
                        <Text style={type.small} numberOfLines={1}>
                          {a.selected_slot ? `📅 ${a.selected_slot.date} ${a.selected_slot.start_time}` : `${c?.category ?? ""} · ${fmtDate(a.created_at)}`}
                        </Text>
                      </View>
                      <AppStatusBadge status={a.status} />
                    </Press>
                  );
                })
              )}
            </Section>
          ) : null}

          {!isOwner ? (
            <Press onPress={() => setReportOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", padding: 8 }}>
              <Ionicons name="flag-outline" size={16} color={colors.muted} />
              <Text style={[type.small, { fontWeight: "700" }]}>Signaler cette offre</Text>
            </Press>
          ) : null}
        </View>
      </Animated.ScrollView>

      <View style={[styles.top, { top: insets.top + 6 }]}>
        <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/offers?tab=offers"))} dark />
        <IconButton name="share-outline" dark onPress={() => Share.share({ message: `${offer.title} — ${budgetLabel(offer)} sur Collab Créa` }).catch(() => {})} />
      </View>

      <Glass style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]} intensity={70}>
        {footer()}
      </Glass>

      <Sheet
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Postuler"
        subtitle={offer.title}
        footer={<Button label="Envoyer ma candidature" icon="paper-plane" onPress={apply} />}
      >
        {offer.on_site_slots.length ? (
          <View style={{ gap: 8 }}>
            <Text style={type.h3}>Choisissez un créneau *</Text>
            {offer.on_site_slots.map((s, i) => {
              const on = slot === s;
              return (
                <Press key={i} onPress={() => setSlot(s)} style={[styles.slot, on && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]} scaleTo={0.98}>
                  <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.primary : colors.muted} />
                  <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
                    {fmtDate(s.date, true)} · {s.start_time}–{s.end_time}
                  </Text>
                </Press>
              );
            })}
          </View>
        ) : null}
        <View style={{ gap: 6 }}>
          <Text style={type.h3}>Message (optionnel)</Text>
          <TextInput value={msg} onChangeText={setMsg} multiline placeholder="Présentez-vous et expliquez votre idée…" placeholderTextColor={colors.muted} style={styles.area} />
        </View>
      </Sheet>

      <Sheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Signaler cette offre"
        footer={
          <Button
            label="Envoyer le signalement"
            icon="flag"
            variant="dark"
            onPress={() => {
              report({ report_type: "offer", target_offer_id: offer.id, target_user_id: offer.brand_id, reason, description: details.trim() || undefined });
              setReportOpen(false);
              setDetails("");
              toast("Signalement envoyé. Merci !");
            }}
          />
        }
      >
        <Chips options={REASONS} value={reason} onChange={setReason} />
        <TextInput value={details} onChangeText={setDetails} multiline placeholder="Précisez (optionnel)" placeholderTextColor={colors.muted} style={styles.area} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" },
  sheet: { marginTop: -32, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, gap: 22 },
  pill: { backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  info: { width: "48.5%", backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 4 },
  infoIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12 },
  secure: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#E4F6EC", borderRadius: radius.md, padding: 14 },
  cand: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 12, borderRadius: radius.lg },
  slot: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  area: { minHeight: 100, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 14, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderRadius: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
});
