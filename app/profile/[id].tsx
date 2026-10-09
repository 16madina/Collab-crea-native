import { PublicCreatorLux } from "../../src/components/profile/PublicCreatorLux";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ReactNode, useMemo, useState } from "react";
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collabTypeLabel, DEFAULT_RATES, formatFollowers, money, parseFollowers, PLATFORM } from "../../src/components/account/constants";
import { ReportSheet } from "../../src/components/account/ReportSheet";
import { Sheet } from "../../src/components/account/Sheet";
import { PillTabs, Stars } from "../../src/components/account/widgets";
import { africanCountries, worldCountries } from "../../src/countries";
import { Badge, Banner, Card, Empty, Field, fmtDate, Screen, toast } from "../../src/kit";
import { budgetLabel, displayName, useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Profile, SocialPlatform } from "../../src/types";
import { Avatar, Button, Glass, IconButton, Press } from "../../src/ui";

const W = Dimensions.get("window").width;
const TILE = (W - 40 - 16) / 3;
const flagOf = (name?: string) => (name ? (worldCountries.find((c) => c.name === name) ?? africanCountries.find((c) => c.name === name))?.flag ?? "🌍" : "");

type Tab = "infos" | "portfolio" | "tarifs" | "avis";

const confirmBlock = (name: string, ok: () => void) => {
  const msg = `${name} ne pourra plus vous envoyer de messages.`;
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`Bloquer ${name} ?\n${msg}`)) ok();
    return;
  }
  Alert.alert(`Bloquer ${name} ?`, msg, [
    { text: "Annuler", style: "cancel" },
    { text: "Bloquer", style: "destructive", onPress: ok },
  ]);
};

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profiles = useDB((s) => s.profiles);
  const userId = useDB((s) => s.userId);
  const p = useMemo(() => profiles.find((x) => x.user_id === id), [profiles, id]);
  const viewer = useMemo(() => profiles.find((x) => x.user_id === userId), [profiles, userId]);

  if (!p)
    return (
      <Screen title="Profil">
        <Empty icon="person-outline" title="Profil introuvable" text="Ce compte n'existe pas ou a été supprimé." />
      </Screen>
    );
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>{p.role === "brand" ? <BrandView p={p} viewer={viewer} /> : <CreatorView p={p} viewer={viewer} />}</View>;
}

function TopBar({ p, viewer, right }: { p: Profile; viewer?: Profile; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const blockUser = useDB((s) => s.blockUser);
  const blocked = useDB((s) => s.blocked);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const isBlocked = blocked.some((b) => b.blocker_id === viewer?.user_id && b.blocked_id === p.user_id);
  const self = viewer?.user_id === p.user_id;
  return (
    <>
      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <IconButton name="chevron-back" dark onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))} />
        <View style={{ flex: 1 }} />
        {right}
        {viewer && !self ? <IconButton name="ellipsis-horizontal" dark onPress={() => setMenu(true)} /> : null}
      </View>
      <Sheet visible={menu} onClose={() => setMenu(false)} title={displayName(p)}>
        <Press
          onPress={() => {
            setMenu(false);
            setTimeout(() => setReport(true), 250);
          }}
          style={styles.menuRow}
        >
          <Ionicons name="flag-outline" size={20} color={colors.ink} />
          <Text style={styles.menuText}>Signaler</Text>
        </Press>
        <Press
          onPress={() => {
            if (isBlocked) return toast("Cet utilisateur est déjà bloqué", "info");
            setMenu(false);
            confirmBlock(displayName(p), () => {
              const r = blockUser(p.user_id);
              toast(r.ok ? `${displayName(p)} a été bloqué` : r.error, r.ok ? "success" : "error");
            });
          }}
          style={styles.menuRow}
        >
          <Ionicons name="ban-outline" size={20} color="#C53030" />
          <Text style={[styles.menuText, { color: "#C53030" }]}>{isBlocked ? "Utilisateur bloqué" : "Bloquer"}</Text>
        </Press>
      </Sheet>
      <ReportSheet visible={report} onClose={() => setReport(false)} type="user" targetUserId={p.user_id} />
    </>
  );
}

function Hero({ uri, banner }: { uri: string | number; banner?: string | number }) {
  return (
    <View style={{ height: 300 }}>
      <Image source={banner ?? uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(251,244,239,0)", colors.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// ---------- créateur ----------
function CreatorView({ p, viewer }: { p: Profile; viewer?: Profile }) {
  const favorites = useDB((s) => s.favorites);
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const follows = useDB((s) => s.follows);
  const toggleFollow = useDB((s) => s.toggleFollow);
  const [propose, setPropose] = useState(false);
  const isBrand = viewer?.role === "brand";
  const fav = isBrand ? favorites.some((f) => f.brand_id === viewer!.user_id && f.creator_id === p.user_id) : follows.includes(p.user_id);
  const heart = () => {
    if (!viewer) return router.push("/auth/signup");
    if (isBrand) {
      toggleFavorite(p.user_id);
      toast(fav ? "Retiré des favoris" : "Ajouté aux favoris");
    } else toast(toggleFollow(p.user_id) ? "Créateur suivi" : "Abonnement retiré", "info");
  };
  return (
    <>
      <PublicCreatorLux p={p} viewer={viewer} onPropose={() => setPropose(true)} />
      <TopBar p={p} viewer={viewer} right={viewer?.user_id !== p.user_id ? <IconButton name={fav ? "heart" : "heart-outline"} dark onPress={heart} /> : null} />
      {isBrand && viewer ? <ProposeSheet visible={propose} onClose={() => setPropose(false)} creator={p} brand={viewer} /> : null}
    </>
  );
}

function ProposeBar({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Glass style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]} intensity={70}>
      <Button label="Proposer une collaboration" icon="paper-plane-outline" style={{ flex: 1 }} onPress={onPress} />
    </Glass>
  );
}

function ProposeSheet({ visible, onClose, creator, brand }: { visible: boolean; onClose: () => void; creator: Profile; brand: Profile }) {
  const offers = useDB((s) => s.offers);
  const proposeOffer = useDB((s) => s.proposeOffer);
  const active = useMemo(() => offers.filter((o) => o.brand_id === brand.user_id && o.status === "active"), [offers, brand.user_id]);
  const [sel, setSel] = useState<string>();
  const [msg, setMsg] = useState("");

  const send = () => {
    if (!sel) return toast("Choisissez une offre", "error");
    const r = proposeOffer(sel, creator.user_id, msg);
    if (!r.ok) return toast(r.error, "error");
    toast("Proposition envoyée !");
    onClose();
    setSel(undefined);
    setMsg("");
    router.push(`/chat/${r.id}`);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Proposer une collaboration"
      subtitle={`à ${creator.full_name}`}
      footer={brand.email_verified && active.length ? <Button label="Envoyer la proposition" icon="send-outline" onPress={send} /> : undefined}
    >
      {!brand.email_verified ? (
        <>
          <Banner tone="warning" icon="mail-unread-outline">
            Vous devez vérifier votre email avant de contacter un créateur.
          </Banner>
          <Button
            label="Vérifier mon email"
            small
            variant="outline"
            icon={null}
            onPress={() => {
              onClose();
              router.push("/(tabs)/profile");
            }}
          />
        </>
      ) : active.length === 0 ? (
        <Empty
          icon="briefcase-outline"
          title="Vous n'avez pas d'offres actives"
          text="Créez une offre pour pouvoir la proposer à ce créateur."
          action={
            <Button
              label="Créer une offre"
              small
              icon="add"
              onPress={() => {
                onClose();
                router.push("/offer/edit");
              }}
            />
          }
        />
      ) : (
        <>
          {active.map((o, i) => {
            const on = sel === o.id;
            return (
              <Animated.View key={o.id} entering={FadeInDown.delay(i * 40).springify()}>
                <Press onPress={() => setSel(o.id)} scaleTo={0.98} style={[styles.offerRow, on && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
                  {o.images[0] ? <Image source={o.images[0]} style={{ width: 48, height: 48, borderRadius: 12 }} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3} numberOfLines={1}>
                      {o.title}
                    </Text>
                    <Text style={type.tiny}>
                      {o.category} · {budgetLabel(o)}
                    </Text>
                  </View>
                  <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={on ? colors.primary : colors.muted} />
                </Press>
              </Animated.View>
            );
          })}
          <Field label="Message (optionnel)" value={msg} onChangeText={setMsg} multiline maxLength={1000} placeholder={`Bonjour ${creator.full_name.split(" ")[0]}, …`} />
        </>
      )}
    </Sheet>
  );
}

// ---------- marque ----------
function BrandView({ p, viewer }: { p: Profile; viewer?: Profile }) {
  const offers = useDB((s) => s.offers);
  const active = useMemo(() => offers.filter((o) => o.brand_id === p.user_id && o.status === "active"), [offers, p.user_id]);
  const logo = p.logo_url ?? p.avatar_url;
  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Hero uri={logo} banner={p.banner_url} />
        <View style={{ alignItems: "center", marginTop: -80, paddingHorizontal: 20, gap: 4 }}>
          <Animated.View entering={ZoomIn.springify()} style={[styles.logoWrap, shadow.soft]}>
            <Image source={logo} style={{ width: 104, height: 104, borderRadius: 28 }} />
          </Animated.View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Text style={type.h1}>{displayName(p)}</Text>
            {p.email_verified ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </View>
          <Text style={type.small}>
            {p.sector} · {flagOf(p.country)} {p.country}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 20 }}>
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Card>
              <Text style={type.h3}>À propos</Text>
              <Text style={type.body}>{p.company_description || "Aucune description."}</Text>
              {p.website ? (
                <Text style={{ color: colors.primary, fontWeight: "700" }} onPress={() => toast(p.website!, "info")}>
                  <Ionicons name="globe-outline" size={14} /> {p.website.replace(/^https?:\/\//, "")}
                </Text>
              ) : null}
              {p.brand_prefs?.collaboration_types.length ? (
                <>
                  <Text style={[type.tiny, { marginTop: 4 }]}>RECHERCHE</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {p.brand_prefs.collaboration_types.map((c) => (
                      <Badge key={c} label={collabTypeLabel(c)} />
                    ))}
                    {p.brand_prefs.target_categories.map((c) => (
                      <Badge key={c} label={c} tone="dark" />
                    ))}
                  </View>
                </>
              ) : null}
            </Card>
          </Animated.View>
          <Text style={type.h2}>Offres actives ({active.length})</Text>
          {active.length === 0 ? (
            <Empty icon="briefcase-outline" title="Aucune offre active" />
          ) : (
            active.map((o, i) => (
              <Animated.View key={o.id} entering={FadeInDown.delay(120 + i * 50).springify()}>
                <Press onPress={() => router.push(`/offer/${o.id}`)} scaleTo={0.98} style={[styles.offerCard, shadow.soft]}>
                  {o.images[0] ? <Image source={o.images[0]} style={{ height: 130 }} contentFit="cover" transition={250} /> : null}
                  <View style={{ padding: 14, gap: 4 }}>
                    <Text style={type.h3}>{o.title}</Text>
                    <Text style={type.small}>
                      {o.category} · {o.content_types.join(", ")}
                    </Text>
                    <Text style={{ fontWeight: "800", color: colors.ink, marginTop: 2 }}>{budgetLabel(o)}</Text>
                  </View>
                </Press>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
      <TopBar p={p} viewer={viewer} />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: 20, right: 20, flexDirection: "row", gap: 10 },
  avatarWrap: { borderRadius: 64, borderWidth: 4, borderColor: colors.bg },
  logoWrap: { borderRadius: 32, borderWidth: 4, borderColor: colors.bg, backgroundColor: colors.bg },
  verified: { position: "absolute", right: 4, bottom: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  netPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 30, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  netIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", width: "100%", paddingVertical: 16, marginVertical: 18, backgroundColor: "rgba(255,255,255,0.75)" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  play: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", paddingHorizontal: 20, paddingTop: 14, borderRadius: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "rgba(255,255,255,0.82)" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface },
  menuText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  offerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  offerCard: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: "hidden" },
});
