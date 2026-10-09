import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fcfa, offers } from "../../src/data";
import { colors, radius, shadow, type } from "../../src/theme";
import { BrandDot, Button, Glass, IconButton, Meta, Tag } from "../../src/ui";

const HERO = 380;

export default function OfferDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offer = offers.find((o) => o.id === id) ?? offers[0];
  const insets = useSafeAreaInsets();
  const [applied, setApplied] = useState(false);
  const [saved, setSaved] = useState(false);
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(y.value, [-200, 0, HERO], [-100, 0, HERO * 0.5]) },
      { scale: interpolate(y.value, [-200, 0], [1.5, 1], "clamp") },
    ],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={[{ height: HERO }, heroStyle]}>
          <Image source={offer.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={styles.sheet}>
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <BrandDot name={offer.brand} color={offer.brandColor} size={26} />
              <Text style={[type.h3, { flex: 1 }]}>{offer.brand}</Text>
              {offer.tag && <Tag label={offer.tag} />}
            </View>
            <Text style={type.h1}>{offer.title}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.infoGrid}>
            {[
              ["cash-outline", "Budget", fcfa(offer.budget)],
              ["camera-outline", "Format", offer.format],
              ["location-outline", "Lieu", offer.location],
              ["people-outline", "Candidats", `${offer.applicants}`],
            ].map(([icon, label, value]) => (
              <View key={label} style={[styles.info, shadow.soft]}>
                <View style={styles.infoIcon}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                </View>
                <Text style={type.tiny}>{label}</Text>
                <Text style={[type.h3, { fontSize: 14 }]} numberOfLines={1}>
                  {value}
                </Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify()} style={{ gap: 10 }}>
            <Text style={type.h2}>À propos</Text>
            <Text style={type.body}>{offer.description}</Text>
            <Text style={[type.h2, { marginTop: 14 }]}>Livrables</Text>
            {offer.deliverables.map((d) => (
              <View key={d} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={[type.body, { color: colors.ink }]}>{d}</Text>
              </View>
            ))}
            <View style={{ marginTop: 14 }}>
              <Meta icon="calendar-outline" text={offer.deadline} />
            </View>
            <View style={styles.secure}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={[type.small, { flex: 1, color: colors.inkSoft }]}>
                Paiement sécurisé : le budget est bloqué par Collab Créa et versé sur votre Mobile Money à la validation.
              </Text>
            </View>
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <View style={[styles.top, { top: insets.top + 6 }]}>
        <IconButton name="chevron-back" onPress={() => router.back()} dark />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <IconButton name="share-outline" dark />
          <IconButton name={saved ? "bookmark" : "bookmark-outline"} onPress={() => setSaved(!saved)} dark />
        </View>
      </View>

      <Glass style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]} intensity={70}>
        <View>
          <Text style={type.tiny}>Rémunération</Text>
          <Text style={[type.h2, { color: colors.primary }]}>{fcfa(offer.budget)}</Text>
        </View>
        {applied ? (
          <Animated.View entering={ZoomIn.springify()} style={styles.applied}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700" }}>Candidature envoyée</Text>
          </Animated.View>
        ) : (
          <Button label="Postuler" onPress={() => setApplied(true)} style={{ flex: 1, marginLeft: 16 }} />
        )}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" },
  sheet: { marginTop: -32, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 22, gap: 22 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  info: { width: "48.5%", backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 4 },
  infoIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  secure: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#E4F6EC", borderRadius: radius.md, padding: 14, marginTop: 14 },
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
  applied: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.success, height: 54, paddingHorizontal: 20, borderRadius: radius.pill },
});
