// Menu flottant du bouton « + » : actions rapides selon le type de compte.
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "../src/kit";
import { GlossFill, GoldFill, GoldText, goldBorder, goldBorderStrong, goldGlow, luxShadow } from "../src/lux";
import { useMe } from "../src/store";
import { useSpaceSwitch } from "../src/components/SpaceSwitcher";
import { colors, fonts, radius } from "../src/theme";
import { Press } from "../src/ui";

type Role = "brand" | "creator";
type Action = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; to: string; image?: number };

const W = Dimensions.get("window").width;
const CARD_W = Math.floor((W - 16 - 32 - 12 - 4) / 2);

const ACTIONS: Record<Role, Action[]> = {
  brand: [
    { icon: "megaphone-outline", title: "Créer une campagne", sub: "Publier une offre de collaboration", to: "/offer/edit" },
    { icon: "search", title: "Rechercher des créateurs", sub: "Trouver les talents pour votre marque", to: "/(tabs)/offers?tab=creators" },
    { icon: "paper-plane-outline", title: "Inviter un créateur", sub: "Proposer une collaboration directe", to: "/marketplace" },
    { icon: "document-text-outline", title: "Mes campagnes", sub: "Gérer vos offres et candidatures", to: "/(tabs)/profile" },
    { icon: "star-outline", title: "Favoris", sub: "Vos créateurs enregistrés", to: "/(tabs)/profile?tab=favorites" },
    { icon: "stats-chart", title: "Statistiques", sub: "Suivre les performances", to: "/(tabs)/profile?tab=stats" },
  ],
  creator: [
    { icon: "compass-outline", title: "Explorer les offres", sub: "Trouver les campagnes faites pour toi.", to: "/(tabs)/offers?tab=offers", image: require("../assets/menu/search.jpg") },
    { icon: "images-outline", title: "Ajouter au portfolio", sub: "Photos, vidéos, liens TikTok ou Instagram.", to: "/edit/portfolio", image: require("../assets/menu/offer.jpg") },
    { icon: "shield-checkmark-outline", title: "Vérifier un réseau", sub: "Rassure les marques sur tes abonnés.", to: "/verification/social", image: require("../assets/menu/invite.jpg") },
    { icon: "wallet-outline", title: "Mon portefeuille", sub: "Solde, retraits et historique.", to: "/wallet", image: require("../assets/menu/campaigns.jpg") },
  ],
};

function ActionCard({ a, onPress, index }: { a: Action; onPress: () => void; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(120 + index * 70).springify()}>
      <Press onPress={onPress} style={[styles.card, luxShadow]} scaleTo={0.96}>
        <GlossFill />
        {a.image ? <Image source={a.image} style={styles.cardImg} contentFit="cover" /> : null}
        <LinearGradient colors={["rgba(10,10,10,0.1)", "rgba(10,10,10,0.75)", "#0A0A0A"]} locations={[0, 0.5, 0.75]} style={StyleSheet.absoluteFill} />
        <View style={[styles.cardIcon, goldGlow]}>
          <GoldFill style={{ borderRadius: 26 }} />
          <Ionicons name={a.icon} size={24} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.cardTitle}>{a.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
          <Text style={styles.cardSub}>{a.sub}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </View>
      </Press>
    </Animated.View>
  );
}

function ActionRow({ a, onPress, index, first }: { a: Action; onPress: () => void; index: number; first: boolean }) {
  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 55).springify()}>
      <Press onPress={onPress} style={[styles.row, first && goldGlow, !first && { borderColor: goldBorder }]} scaleTo={0.97}>
        {first ? <GoldFill style={{ borderRadius: radius.lg }} /> : <GlossFill style={{ borderRadius: radius.lg }} />}
        <View style={[styles.rowIcon, first && { borderColor: "rgba(11,11,11,0.35)" }]}>
          <Ionicons name={a.icon} size={22} color={first ? colors.onPrimary : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, first && { color: colors.onPrimary }]}>{a.title}</Text>
          <Text style={[styles.rowSub, first && { color: "rgba(11,11,11,0.75)" }]}>{a.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={first ? colors.onPrimary : colors.primary} />
      </Press>
    </Animated.View>
  );
}

export default function CreateMenu() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const myRole: Role = me?.role === "brand" ? "brand" : "creator";
  const [role, setRole] = useState<Role>(myRole);
  const close = () => router.back();
  const sw = useSpaceSwitch();
  const pickRole = (k: Role) => {
    setRole(k);
    if (me && k !== myRole) {
      router.back();
      setTimeout(sw.go, 120);
    }
  };
  const go = (a: Action) => {
    if (role !== myRole) {
      toast(role === "brand" ? "Réservé aux comptes Marque" : "Réservé aux comptes Créateur", "info");
      return;
    }
    router.back();
    setTimeout(() => router.push(a.to as never), 80);
  };

  return (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} />
      </Animated.View>

      <Animated.View entering={SlideInDown.springify().damping(18)} style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <GlossFill />
        {/* reflets dorés du bord supérieur */}
        <LinearGradient colors={["rgba(245,211,148,0.16)", "rgba(245,211,148,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.35 }} style={styles.glowL} pointerEvents="none" />
        <LinearGradient colors={["rgba(245,211,148,0.12)", "rgba(245,211,148,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.55, y: 0.3 }} style={styles.glowR} pointerEvents="none" />

        <View style={styles.grabber}>
          <GoldFill style={{ borderRadius: 3 }} />
        </View>
        <Press onPress={close} style={styles.close} scaleTo={0.88}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Press>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Que veux-</Text>
          <GoldText style={styles.title}>tu faire</GoldText>
          <Text style={styles.title}> ?</Text>
        </View>
        <Text style={styles.subtitle}>Choisis une option pour commencer.</Text>

        <View style={styles.toggle}>
          {(
            [
              ["brand", "Compte Marque", "business-outline"],
              ["creator", "Compte Créateur", "person-outline"],
            ] as const
          ).map(([k, l, ic]) => {
            const on = role === k;
            return (
              <Press key={k} onPress={() => pickRole(k)} style={[styles.toggleItem, on && goldGlow]} scaleTo={0.97}>
                {on && <GoldFill style={{ borderRadius: radius.pill }} />}
                <Ionicons name={ic} size={22} color={on ? colors.onPrimary : colors.ink} />
                <Text style={[styles.toggleText, on && { color: colors.onPrimary, fontWeight: "800" }]}>{l}</Text>
              </Press>
            );
          })}
        </View>

        {role === "brand" ? (
          <View key={role} style={{ gap: 9, marginTop: 16 }}>
            {ACTIONS.brand.map((a, i) => (
              <ActionRow key={a.title} a={a} index={i} first={i === 0} onPress={() => go(a)} />
            ))}
          </View>
        ) : (
          <View key={role} style={styles.grid}>
            {ACTIONS[role].map((a, i) => (
              <ActionCard key={a.title} a={a} index={i} onPress={() => go(a)} />
            ))}
          </View>
        )}
        {role !== myRole && (
          <Animated.Text entering={FadeIn} style={styles.note}>
            {me ? `Ces actions sont réservées aux comptes ${role === "brand" ? "Marque" : "Créateur"}.` : "Crée ton compte pour utiliser ces actions."}
          </Animated.Text>
        )}
        <View style={[styles.grabber, { marginTop: 18, marginBottom: 0 }]}>
          <GoldFill style={{ borderRadius: 3 }} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 34,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderWidth: 1.2,
    borderColor: goldBorderStrong,
    backgroundColor: "#0B0B0B",
    shadowColor: "#D9AC65",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  glowL: { position: "absolute", top: 0, left: 0, width: "70%", height: 220 },
  glowR: { position: "absolute", top: 0, right: 0, width: "50%", height: 180 },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  close: { position: "absolute", top: 16, right: 16, width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(11,11,11,0.75)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  titleRow: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 33, color: colors.ink },
  subtitle: { color: colors.ink, fontSize: 13, textAlign: "center", marginTop: 4, opacity: 0.9 },
  toggle: { flexDirection: "row", marginTop: 20, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.03)" },
  toggleItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: radius.pill },
  toggleText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  card: { width: CARD_W, height: 170, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, padding: 14, backgroundColor: "#0A0A0A" },
  cardImg: { position: "absolute", top: 0, right: 0, width: "78%", height: "62%", opacity: 0.9 },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 16, lineHeight: 19 },
  cardSub: { flex: 1, color: colors.inkSoft, fontSize: 11, lineHeight: 14, marginTop: 3 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, height: 66, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: "transparent" },
  rowIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: goldBorderStrong, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  rowSub: { color: colors.inkSoft, fontSize: 11, marginTop: 2 },
  note: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 12 },
});
