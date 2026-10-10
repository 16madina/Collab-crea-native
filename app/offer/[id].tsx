import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, Share, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStatusBadge, avatarOf, InfoBox, nameOf } from "../../src/components/collab/common";
import { Sheet } from "../../src/components/collab/Sheet";
import { Banner, Chips, Empty, fmtDate, toast } from "../../src/kit";
import { budgetLabel, useDB, useMe } from "../../src/store";
import { colors, fonts, radius, shadow, type } from "../../src/theme";
import { Avatar, Button, OFFER_FALLBACK, Press } from "../../src/ui";
import { GoldButton, goldBorder, goldBorderStrong } from "../../src/lux";
import { logoOf } from "../../src/components/offers/OfferCards";
import { initials } from "../../src/components/home/CreatorTile";

const SW = Dimensions.get("window").width;
const HERO = 380;
const REASONS = ["Offre trompeuse / Fausses informations", "Arnaque ou fraude", "Contenu inapproprié", "Rémunération abusive", "Autre"];

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ gap: 10 }}>
      <Text style={styles.secTitle}>{title}</Text>
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
  const report = useDB((s) => s.report);
  const favs = useDB((s) => s.offerFavs);
  const toggleFav = useDB((s) => s.toggleOfferFav);
  const [moreOpen, setMoreOpen] = useState(false);
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
    return <GoldButton label={myApp?.status === "rejected" ? "Postuler à nouveau" : "Postuler à cette offre"} size="lg" onPress={() => router.push(`/apply/${offer.id}`)} style={{ flex: 1 }} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <Animated.View style={[{ height: HERO }, heroStyle]}>
          <Image source={offer.images[0] ?? OFFER_FALLBACK} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(5,5,5,0.45)", "rgba(5,5,5,0)", "rgba(5,5,5,0.2)", "#050505"]} locations={[0, 0.25, 0.7, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={styles.sheet}>
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 6, marginTop: -64 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>{initials(nameOf(brand))}</Text>
                <Image source={logoOf(offer, brand)} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
              {brand && !isOwner ? (
                <Press onPress={() => router.push(`/profile/${brand.user_id}`)} style={styles.profileBtn} scaleTo={0.95}>
                  <Text style={styles.profileBtnText}>Voir le profil</Text>
                </Press>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Text style={styles.brandName} numberOfLines={1}>{nameOf(brand)}</Text>
              {brand?.identity_verified ? <Ionicons name="checkmark-circle" size={17} color={colors.primary} /> : null}
            </View>
            <Text style={styles.muted}>Marque • {brand?.sector || offer.category}</Text>
            {brand?.country ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={13} color={colors.inkSoft} />
                <Text style={styles.muted}>{brand.country}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{offer.title}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {[offer.category, ...offer.content_types].map((t) => (
                <View key={t} style={styles.chip}>
                  <Text style={styles.chipText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.stats}>
            {(
              [
                ["cash-outline", budgetLabel(offer), "Budget"],
                ["calendar-outline", offer.deadline ? `Jusqu'au ${fmtDate(offer.deadline, true)}` : "Sans date limite", "Date limite"],
                ["people-outline", `${candidates.length} candidature${candidates.length > 1 ? "s" : ""}`, "Déjà reçues"],
              ] as const
            ).map(([icon, value, label], i) => (
              <View key={label} style={[styles.stat, i > 0 && styles.statSep]}>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
                  <Ionicons name={icon} size={18} color={colors.primary} style={{ marginTop: 1 }} />
                  <Text style={[styles.statValue, i === 0 && { color: "#E7BE78" }]} numberOfLines={2}>{value}</Text>
                </View>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </Animated.View>

          {isCreator && !me.identity_verified && !isOwner ? (
            <Banner tone="warning" icon="shield-outline">
              <Text style={[type.small, { color: colors.inkSoft }]}>Vérifiez votre identité pour postuler aux offres.</Text>
              <Press onPress={() => router.push("/verification/identity")}>
                <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4 }}>Vérifier mon identité →</Text>
              </Press>
            </Banner>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 }}>
            <Ionicons name="globe-outline" size={14} color={colors.inkSoft} />
            <Text style={styles.muted}>Pays ciblés : {offer.location || "Tous les pays africains"}</Text>
          </View>

          <Section title="À propos de cette campagne" delay={140}>
            <Text style={styles.body}>{offer.description}</Text>
            {offer.expectations ? (
              <>
                <Text style={[styles.subTitle, { marginTop: 6 }]}>Attentes</Text>
                <Text style={styles.body}>{offer.expectations}</Text>
              </>
            ) : null}
            {offer.restrictions ? (
              <>
                <Text style={[styles.subTitle, { marginTop: 6 }]}>Restrictions</Text>
                <Text style={styles.body}>{offer.restrictions}</Text>
              </>
            ) : null}
          </Section>

          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.box}>
            <Text style={styles.subTitle}>Types de contenu attendus</Text>
            {(offer.deliverables?.length ? offer.deliverables : offer.content_types).map((d, i) => (
              <View key={d} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.delivIcon}>
                  <Ionicons name={(["logo-instagram", "aperture-outline", "pricetag-outline", "sparkles-outline"] as const)[i % 4]} size={14} color={colors.primary} />
                </View>
                <Text style={[styles.body, { flex: 1 }]}>{d}</Text>
              </View>
            ))}
          </Animated.View>

          {offer.images.length > 1 ? (
            <Section title="Exemples de références" delay={170}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {offer.images.slice(1, 4).map((im, i) => (
                  <View key={i} style={styles.ref}>
                    <Image source={im} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFill} />
                    <Ionicons name="play" size={14} color="#fff" style={{ position: "absolute", left: 8, bottom: 8 }} />
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {offer.criteria?.length ? (
            <Section title="Critères de sélection" delay={175}>
              {offer.criteria.map((c) => (
                <View key={c} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                  <Text style={[styles.body, { flex: 1 }]}>{c}</Text>
                </View>
              ))}
            </Section>
          ) : null}

          <Section title="Mode de livraison" delay={180}>
            <View style={styles.box}>
              <Text style={styles.subTitle}>{offer.delivery_mode === "network" ? "📱 Publication réseau" : "📦 Livraison privée"}</Text>
              <Text style={type.small}>
                {offer.delivery_mode === "network"
                  ? "Le créateur soumet d'abord un aperçu. Une fois validé, il publie sur ses réseaux puis soumet le lien de publication pour déclencher le paiement."
                  : "Le créateur livre le contenu directement à la marque (fichiers / liens privés). Rien n'est publié sur ses réseaux."}
              </Text>
            </View>
          </Section>

          {offer.presence_mode === "on_site" ? (
            <Section title="📍 Sur place" delay={200}>
              <View style={styles.box}>
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
              <View style={styles.box}>
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
                    <Press key={a.id} onPress={() => router.push(`/chat/${a.conversation_id}`)} style={styles.cand} scaleTo={0.98}>
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
        <Press onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/offers?tab=offers"))} style={styles.round} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={22} color="#F8F6F2" />
        </Press>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {!isOwner ? (
            <Press onPress={() => toggleFav(offer.id)} style={styles.round} scaleTo={0.9}>
              <Ionicons name={favs.includes(`${me.user_id}:${offer.id}`) ? "heart" : "heart-outline"} size={20} color={favs.includes(`${me.user_id}:${offer.id}`) ? colors.primary : "#F8F6F2"} />
            </Press>
          ) : null}
          <Press onPress={() => setMoreOpen(true)} style={styles.round} scaleTo={0.9}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#F8F6F2" />
          </Press>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>{footer()}</View>

      <Sheet visible={moreOpen} onClose={() => setMoreOpen(false)} title="Options">
        <Button
          label="Partager l'offre"
          icon="share-outline"
          variant="outline"
          onPress={() => {
            setMoreOpen(false);
            Share.share({ message: `${offer.title} — ${budgetLabel(offer)} sur Collab Créa` }).catch(() => {});
          }}
        />
        {!isOwner ? (
          <Button
            label="Signaler cette offre"
            icon="flag-outline"
            variant="outline"
            onPress={() => {
              setMoreOpen(false);
              setTimeout(() => setReportOpen(true), 250);
            }}
          />
        ) : null}
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
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(5,5,5,0.45)", borderWidth: 1, borderColor: "rgba(248,246,242,0.35)", alignItems: "center", justifyContent: "center" },
  sheet: { backgroundColor: "#050505", paddingHorizontal: 18, paddingBottom: 22, gap: 20 },
  logo: { width: 104, height: 104, borderRadius: 52, overflow: "hidden", backgroundColor: "#050505", borderWidth: 1.5, borderColor: "#D9AC65", alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 28 },
  profileBtn: { paddingHorizontal: 16, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: "#D9AC65", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(217,172,101,0.06)" },
  profileBtnText: { color: "#E7BE78", fontSize: 12, fontWeight: "700" },
  brandName: { fontFamily: fonts.serif, color: "#F8F6F2", fontSize: 20, flexShrink: 1 },
  muted: { color: colors.inkSoft, fontSize: 12 },
  title: { fontFamily: fonts.serif, color: "#F8F6F2", fontSize: 24, lineHeight: 29, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "#171717", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chipText: { color: "#F8F6F2", fontSize: 11, fontWeight: "600" },
  stats: { flexDirection: "row", paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: goldBorder },
  stat: { flex: 1, gap: 4, paddingHorizontal: 6 },
  statSep: { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: goldBorder },
  statValue: { color: "#F8F6F2", fontSize: 12, fontWeight: "700", flexShrink: 1, lineHeight: 16 },
  statLabel: { color: colors.inkSoft, fontSize: 10, marginLeft: 24 },
  secTitle: { color: "#F8F6F2", fontSize: 15, fontWeight: "700" },
  subTitle: { color: "#F8F6F2", fontSize: 13, fontWeight: "700" },
  body: { color: "#D6D1C8", fontSize: 12.5, lineHeight: 19 },
  delivIcon: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: goldBorderStrong, alignItems: "center", justifyContent: "center" },
  ref: { flex: 1, aspectRatio: 1.15, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  pill: { backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  box: { backgroundColor: "#0F0F0F", borderRadius: 16, borderWidth: 1, borderColor: goldBorder, padding: 14, gap: 10 },
  secure: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.successSoft, borderRadius: radius.md, padding: 14 },
  cand: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0F0F0F", borderWidth: 1, borderColor: goldBorder, padding: 12, borderRadius: radius.lg },
  area: { minHeight: 100, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 14, fontSize: 13, color: colors.ink, textAlignVertical: "top" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 12, backgroundColor: "rgba(5,5,5,0.92)", borderTopWidth: StyleSheet.hairlineWidth, borderColor: goldBorder },
});
