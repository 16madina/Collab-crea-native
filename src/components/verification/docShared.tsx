// Habillage commun de la photo de la pièce d'identité : cadre au format carte, coins dorés,
// ligne de scan, déclencheur, puis vérification de la photo (« Reprendre » / « Valider »).
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { pickMedia, type Picked } from "../../backend/upload";
import { toast } from "../../kit";
import { Button, Press } from "../../ui";
import { GOLD } from "./scanShared";

export type DocSide = { title: string; sub: string; ratio: number; step: string };

export function DocCaptureUI({
  side,
  cameraLayer,
  shoot,
  onDone,
  onCancel,
}: {
  side: DocSide;
  cameraLayer?: ReactNode;
  shoot?: () => Promise<Picked | null>;
  onDone: (p: Picked) => void;
  onCancel: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [shot, setShot] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);

  const W = width - 40;
  const H = W / side.ratio;
  const x = 20;
  const y = insets.top + 150;
  const r = 18;

  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -40 + sweep.value * (H + 10) }] }));

  const hole = `M0 0H${width}V${height}H0Z M${x + r} ${y}H${x + W - r}A${r} ${r} 0 0 1 ${x + W} ${y + r}V${y + H - r}A${r} ${r} 0 0 1 ${x + W - r} ${y + H}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + H - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const L = 34;
  const corners = [
    `M${x} ${y + L}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + L}`,
    `M${x + W - L} ${y}H${x + W - r}A${r} ${r} 0 0 1 ${x + W} ${y + r}V${y + L}`,
    `M${x + W} ${y + H - L}V${y + H - r}A${r} ${r} 0 0 1 ${x + W - r} ${y + H}H${x + W - L}`,
    `M${x + L} ${y + H}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + H - r}V${y + H - L}`,
  ];

  const take = async (fromGallery: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const p = fromGallery || !shoot ? await pickMedia("image") : await shoot();
      if (p) setShot(p);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
      {shot ? null : cameraLayer}
      <View style={{ position: "absolute", left: x, top: y, width: W, height: H, borderRadius: r, overflow: "hidden" }}>
        {shot ? (
          <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
            <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        ) : (
          <>
            {!cameraLayer ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1A1712", alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="card-outline" size={64} color="#3A332A" />
              </View>
            ) : null}
            <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 40 }, sweepStyle]}>
              <LinearGradient colors={["rgba(216,173,106,0)", "rgba(216,173,106,0.32)"]} style={{ flex: 1 }} />
              <View style={{ height: 2, backgroundColor: GOLD }} />
            </Animated.View>
          </>
        )}
      </View>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={hole} fill="rgba(5,5,5,0.82)" fillRule="evenodd" />
        {corners.map((d) => (
          <Path key={d} d={d} stroke={GOLD} strokeWidth={4} fill="none" strokeLinecap="round" />
        ))}
      </Svg>

      <View style={[st.top, { top: insets.top + 8 }]}>
        <Press onPress={onCancel} style={st.close} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Press>
        <Text style={st.topTitle}>{"Pièce d'identité"}</Text>
        <Text style={st.topCount}>{side.step}</Text>
      </View>
      <Animated.View key={side.title + (shot ? "1" : "0")} entering={FadeInDown.duration(300)} style={{ position: "absolute", left: 24, right: 24, top: insets.top + 66, alignItems: "center", gap: 6 }}>
        <Text style={st.title}>{shot ? "La photo est-elle lisible ?" : side.title}</Text>
        <Text style={st.sub}>{shot ? "Vérifiez que tout le texte et la photo sont nets, sans reflet." : side.sub}</Text>
      </Animated.View>

      <View style={{ position: "absolute", left: 24, right: 24, top: y + H + 28, gap: 10 }}>
        {[
          ["sunny-outline", "Bonne lumière, sans reflet"],
          ["scan-outline", "Les 4 coins visibles dans le cadre"],
          ["eye-outline", "Texte et photo bien nets"],
        ].map(([ic, t]) => (
          <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={17} color={GOLD} />
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={[st.bottom, { bottom: insets.bottom + 24 }]}>
        {shot ? (
          <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
            <Button label="Reprendre" variant="outline" icon="refresh" style={{ flex: 1 }} onPress={() => setShot(null)} />
            <Button label="Valider" icon="checkmark" style={{ flex: 1 }} onPress={() => onDone(shot)} />
          </View>
        ) : shoot ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", paddingHorizontal: 20 }}>
            <Press onPress={() => void take(true)} style={st.side}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </Press>
            <Press onPress={() => void take(false)} style={st.shutter} scaleTo={0.9}>
              {busy ? <ActivityIndicator color="#000" /> : <View style={st.shutterIn} />}
            </Press>
            <View style={{ width: 48 }} />
          </View>
        ) : (
          <Button label={busy ? "Ouverture…" : "Choisir une photo"} icon="images-outline" style={{ alignSelf: "stretch" }} onPress={() => void take(true)} />
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  topTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  topCount: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", width: 40, textAlign: "right" },
  title: { color: "#fff", fontSize: 21, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", lineHeight: 19 },
  bottom: { position: "absolute", left: 20, right: 20, alignItems: "center" },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterIn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" },
  side: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
});
