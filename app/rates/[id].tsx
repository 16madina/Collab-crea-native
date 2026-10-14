// Grille tarifaire d'un créateur, telle que la voient les marques :
// style « affiche » : photo du créateur en plein fond, un bandeau par réseau (logo),
// puis chaque tarif sur une ligne (prestation à gauche, prix à droite), packages encadrés, options.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_RATES, money, platformOfType } from "../../src/components/account/constants";
import { flagOf } from "../../src/components/collab/common";
import { Empty } from "../../src/kit";
import { useDB } from "../../src/store";
import { fonts, radius } from "../../src/theme";
import type { PricingItem, SocialPlatform } from "../../src/types";
import { Press } from "../../src/ui";

const W = Dimensions.get("window").width;

const NET: Record<SocialPlatform, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; label: string }> = {
  tiktok: { icon: "logo-tiktok", bg: "#111111", fg: "#FFFFFF", label: "TikTok" },
  instagram: { icon: "logo-instagram", bg: "#E1306C", fg: "#FFFFFF", label: "Instagram" },
  youtube: { icon: "logo-youtube", bg: "#FF0000", fg: "#FFFFFF", label: "YouTube" },
  facebook: { icon: "logo-facebook", bg: "#1877F2", fg: "#FFFFFF", label: "Facebook" },
  snapchat: { icon: "logo-snapchat", bg: "#FFFC00", fg: "#111111", label: "Snapchat" },
};
const ORDER: SocialPlatform[] = ["tiktok", "instagram", "youtube", "facebook", "snapchat"];

function NetIcon({ p, size = 34 }: { p: SocialPlatform; size?: number }) {
  const n = NET[p];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: n.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={n.icon} size={size * 0.58} color={n.fg} />
    </View>
  );
}

/** « Story Instagram (24 h) » sous le bandeau Instagram → « Story (24 h) ». */
const shortLabel = (type: string, label: string) => {
  const t = type.replace(new RegExp(`\\s*${label}\\s*`, "i"), " ").replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const INK = "#FFF8F3";
const SOFT = "rgba(255,248,243,0.82)";
const PILL = "rgba(150,108,108,0.92)";

function Line({ label, sub, price }: { label: string; sub?: string; price: string }) {
  return (
    <View style={styles.line}>
      <View style={{ flex: 1 }}>
        <Text style={styles.lineLabel}>{label}</Text>
        {sub ? <Text style={styles.lineSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.linePrice}>{price}</Text>
    </View>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <View style={styles.pill}>{children}</View>;
}

export default function RateCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const p = useDB((s) => s.profiles.find((x) => x.user_id === id));

  if (!p) return <Empty icon="person-outline" title="Créateur introuvable" />;
  const cur = p.pricing?.currency ?? "XOF";
  const all: PricingItem[] = p.pricing?.items?.length ? p.pricing.items : DEFAULT_RATES;
  const groups = ORDER.map((n) => ({ n, list: all.filter((i) => platformOfType(i.type) === n) })).filter((g) => g.list.length);
  const others = all.filter((i) => platformOfType(i.type) === "other");
  const packs = all.filter((i) => platformOfType(i.type) === "pack");
  const options = p.pricing?.options ?? [];
  const nets = ORDER.filter((n) => p.followers?.[n]);
  const place = p.residence_country || p.country;

  return (
    <View style={{ flex: 1, backgroundColor: "#2A1E1C" }}>
      {/* Photo du créateur en plein fond + voile */}
      <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(52,38,36,0.62)" }]} />
      <LinearGradient colors={["rgba(30,20,18,0.55)", "rgba(30,20,18,0)", "rgba(30,20,18,0.35)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 22 }} showsVerticalScrollIndicator={false}>
        <Press onPress={() => router.back()} style={styles.back} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={22} color={INK} />
        </Press>

        <Text style={styles.title}>GRILLE{"\n"}TARIFAIRE</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {p.full_name}
          </Text>
          {p.identity_verified && <Ionicons name="checkmark-circle" size={18} color="#E8B98F" />}
        </View>
        {place ? (
          <Text style={styles.place}>
            {flagOf(place)} {place}
          </Text>
        ) : null}
        {nets.length ? (
          <View style={styles.netRow}>
            {nets.map((n) => (
              <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <NetIcon p={n} size={20} />
                <Text style={styles.netCount}>{p.followers[n]}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Un bandeau par réseau, puis ses tarifs ligne par ligne */}
        {groups.map(({ n, list }) => (
          <View key={n} style={styles.block}>
            <Banner>
              <NetIcon p={n} size={22} />
              <Text style={styles.pillText}>{NET[n].label.toUpperCase()}</Text>
            </Banner>
            {list.map((it, i) => (
              <Line key={i} label={shortLabel(it.type, NET[n].label)} sub={it.description} price={money(it.price, cur)} />
            ))}
          </View>
        ))}

        {others.length ? (
          <View style={styles.block}>
            <Banner>
              <Ionicons name="pricetags-outline" size={18} color={INK} />
              <Text style={styles.pillText}>AUTRES SERVICES</Text>
            </Banner>
            {others.map((it, i) => (
              <Line key={i} label={it.type} sub={it.description} price={money(it.price, cur)} />
            ))}
          </View>
        ) : null}

        {/* Packages encadrés */}
        {packs.length ? (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Les packages :</Text>
            {packs.map((it, i) => (
              <Line key={i} label={it.type} sub={it.description} price={money(it.price, cur)} />
            ))}
          </View>
        ) : null}

        {options.length ? (
          <View style={styles.block}>
            <Banner>
              <Ionicons name="sparkles-outline" size={18} color={INK} />
              <Text style={styles.pillText}>OPTIONS</Text>
            </Banner>
            {options.map((o, i) => (
              <Line key={i} label={o.label} price={`+ ${o.unit === "%" ? `${o.value} %` : money(o.value, cur)}`} />
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>RÉSERVATION & PAIEMENT SÉCURISÉ</Text>
          <Text style={styles.footerText}>Via Collab Créa · paiement protégé jusqu'à la validation du contenu</Text>
        </View>
        {!p.pricing?.items?.length ? <Text style={styles.note}>Tarifs indicatifs : ce créateur n'a pas encore publié sa grille.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,20,18,0.35)", borderWidth: 1, borderColor: "rgba(255,248,243,0.3)" },
  title: { color: INK, fontSize: 44, lineHeight: 46, fontWeight: "800", letterSpacing: -1.5, textAlign: "center", marginTop: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 },
  name: { fontFamily: fonts.serif, color: INK, fontSize: 20, flexShrink: 1 },
  place: { color: SOFT, fontSize: 13, textAlign: "center", marginTop: 2 },
  netRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 10 },
  netCount: { color: INK, fontSize: 13, fontWeight: "700" },
  block: { marginTop: 22 },
  pill: { alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minWidth: "68%", paddingVertical: 8, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: PILL, borderWidth: 1, borderColor: "rgba(30,20,18,0.55)", marginBottom: 10 },
  pillText: { color: INK, fontSize: 15, fontWeight: "600", letterSpacing: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 5 },
  lineLabel: { fontFamily: fonts.serif, color: INK, fontSize: 18, lineHeight: 22 },
  lineSub: { color: SOFT, fontSize: 11, marginTop: 1 },
  linePrice: { fontFamily: fonts.serif, color: INK, fontSize: 18 },
  box: { marginTop: 24, borderRadius: 28, borderWidth: 1.5, borderColor: "rgba(255,248,243,0.55)", paddingVertical: 14, paddingHorizontal: 18, backgroundColor: "rgba(30,20,18,0.18)" },
  boxTitle: { color: INK, fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  footer: { marginTop: 26, marginHorizontal: -22, paddingVertical: 14, paddingHorizontal: 22, backgroundColor: PILL, alignItems: "center", gap: 3 },
  footerTitle: { color: INK, fontSize: 14, fontWeight: "700", letterSpacing: 0.5, textAlign: "center" },
  footerText: { color: SOFT, fontSize: 12, textAlign: "center" },
  note: { color: SOFT, fontSize: 11, textAlign: "center", marginTop: 12 },
});
