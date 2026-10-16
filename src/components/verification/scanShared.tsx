// Habillage commun du scan du visage (téléphone et aperçu web) : cercle, graduations qui s'allument
// direction par direction (comme Face ID), ligne de scan qui balaie le visage, consignes.
// Toujours sombre, comme une caméra, quel que soit le thème de l'app.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Path } from "react-native-svg";
import { Press } from "../../ui";

export const GOLD = "#D8AD6A";
export const GREEN = "#4CC38A";

export type ScanStep = "center" | "left" | "right" | "up" | "down";
export const SCAN_STEPS: { key: ScanStep; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "center", title: "Regardez droit devant", icon: "scan-outline" },
  { key: "left", title: "Tournez la tête à gauche", icon: "arrow-back" },
  { key: "right", title: "Tournez la tête à droite", icon: "arrow-forward" },
  { key: "up", title: "Levez la tête", icon: "arrow-up" },
  { key: "down", title: "Baissez la tête", icon: "arrow-down" },
];

const TICKS = 72; // graduations autour du cercle
const PER_SIDE = TICKS / 4;

/** Côté du cercle d'une graduation (0 = en haut, sens des aiguilles d'une montre). */
function sideOf(i: number): ScanStep {
  const deg = (i / TICKS) * 360;
  if (deg >= 315 || deg < 45) return "up";
  if (deg < 135) return "right";
  if (deg < 225) return "down";
  return "left";
}

/** Nombre de graduations allumées par côté : elles s'allument une à une quand une direction est validée. */
function useLitTicks(done: ScanStep[]) {
  const [lit, setLit] = useState<Record<string, number>>({});
  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);
  useEffect(() => {
    const t = setInterval(() => {
      setLit((cur) => {
        let changed = false;
        const next = { ...cur };
        for (const s of doneRef.current) {
          if (s === "center") continue;
          if ((next[s] ?? 0) < PER_SIDE) {
            next[s] = (next[s] ?? 0) + 1;
            changed = true;
          }
        }
        return changed ? next : cur;
      });
    }, 22);
    return () => clearInterval(t);
  }, []);
  return lit;
}

export function useScanLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const D = Math.min(width * 0.74, 300, height * 0.4);
  const cx = width / 2;
  const cy = insets.top + 112 + D / 2;
  return { width, height, D, cx, cy, insets };
}

export function ScanOverlay({
  step,
  done,
  hint,
  finished,
  faceSeen,
  inside,
  onClose,
}: {
  step: number;
  done: ScanStep[];
  hint: string | null;
  finished: boolean;
  faceSeen: boolean;
  inside?: ReactNode;
  onClose: () => void;
}) {
  const { width, height, D, cx, cy, insets } = useScanLayout();
  const R = D / 2;
  const lit = useLitTicks(done);
  const cur = SCAN_STEPS[Math.min(step, SCAN_STEPS.length - 1)];
  const ready = done.includes("center");

  // Ligne de scan qui balaie le visage de haut en bas, en continu.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -60 + sweep.value * (D + 20) }] }));

  // Flèche qui indique la direction à suivre.
  const nudge = useSharedValue(0);
  useEffect(() => {
    nudge.value = 0;
    nudge.value = withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })), -1);
  }, [step, nudge]);
  const dir = cur.key;
  const arrowStyle = useAnimatedStyle(() => {
    const d = nudge.value * 10;
    return {
      opacity: 0.55 + nudge.value * 0.45,
      transform: [{ translateX: dir === "left" ? -d : dir === "right" ? d : 0 }, { translateY: dir === "up" ? -d : dir === "down" ? d : 0 }],
    };
  });
  const arrowPos =
    dir === "left" ? { left: cx - R - 54, top: cy - 18 } : dir === "right" ? { left: cx + R + 18, top: cy - 18 } : dir === "up" ? { left: cx - 18, top: cy - R - 54 } : { left: cx - 18, top: cy + R + 18 };

  const hole = `M0 0H${width}V${height}H0Z M${cx - R} ${cy} a${R} ${R} 0 1 0 ${D} 0 a${R} ${R} 0 1 0 ${-D} 0Z`;
  const tickColor = (i: number) => {
    if (finished) return GREEN;
    const side = sideOf(i);
    const idx = side === "up" ? (i + PER_SIDE / 2) % TICKS : i - (side === "right" ? PER_SIDE / 2 : side === "down" ? PER_SIDE * 1.5 : PER_SIDE * 2.5);
    if ((lit[side] ?? 0) > idx) return GOLD;
    if (ready && side === dir) return "rgba(255,255,255,0.75)";
    return ready ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.16)";
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Contenu dans le cercle (silhouette sur l'aperçu web) + ligne de scan. */}
      <View style={{ position: "absolute", left: cx - R, top: cy - R, width: D, height: D, borderRadius: R, overflow: "hidden" }}>
        {inside}
        {!finished ? (
          <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 60 }, sweepStyle]}>
            <LinearGradient colors={["rgba(216,173,106,0)", "rgba(216,173,106,0.38)"]} style={{ flex: 1 }} />
            <View style={{ height: 2, backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 1, shadowRadius: 8 }} />
          </Animated.View>
        ) : null}
      </View>

      {/* Masque sombre avec le trou rond + graduations. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={hole} fill="rgba(5,5,5,0.86)" fillRule="evenodd" />
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI;
          const r1 = R + 10;
          const r2 = R + 24;
          return (
            <Line
              key={i}
              x1={cx + r1 * Math.sin(a)}
              y1={cy - r1 * Math.cos(a)}
              x2={cx + r2 * Math.sin(a)}
              y2={cy - r2 * Math.cos(a)}
              stroke={tickColor(i)}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>

      {/* Bord du cercle : doré quand le visage est bien placé. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: cx - R - 2, top: cy - R - 2, width: D + 4, height: D + 4, borderRadius: R + 2, borderWidth: 2, borderColor: finished ? GREEN : faceSeen ? GOLD : "rgba(255,255,255,0.18)" }}
      />

      {finished ? (
        <Animated.View entering={ZoomIn.duration(360)} style={{ position: "absolute", left: cx - 44, top: cy - 44, width: 88, height: 88, borderRadius: 44, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="checkmark" size={56} color="#fff" />
        </Animated.View>
      ) : ready ? (
        <Animated.View style={[{ position: "absolute", width: 36, height: 36 }, arrowPos, arrowStyle]} pointerEvents="none">
          <Ionicons name={cur.icon} size={36} color={GOLD} />
        </Animated.View>
      ) : null}

      {/* En-tête. */}
      <View style={[st.top, { top: insets.top + 8 }]}>
        <Press onPress={onClose} style={st.close} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Press>
        <Text style={st.topTitle}>Scan du visage</Text>
        <Text style={st.topCount}>{finished ? "5/5" : `${Math.min(step + 1, 5)}/5`}</Text>
      </View>

      {/* Consigne + aide. */}
      <View style={{ position: "absolute", left: 24, right: 24, top: cy + R + 70, alignItems: "center", gap: 12 }}>
        <Animated.Text key={finished ? "fin" : step} entering={FadeInDown.duration(300)} style={st.title}>
          {finished ? "Scan terminé" : cur.title}
        </Animated.Text>
        {hint && !finished ? (
          <Animated.View key={hint} entering={FadeIn.duration(200)} style={st.hint}>
            <Ionicons name="information-circle" size={16} color={GOLD} />
            <Text style={st.hintText}>{hint}</Text>
          </Animated.View>
        ) : (
          <Text style={st.sub}>{finished ? "Votre visage a bien été enregistré." : "Gardez le visage dans le cercle et bougez lentement."}</Text>
        )}
      </View>

      {/* Étapes. */}
      <View style={[st.dots, { bottom: insets.bottom + 34 }]}>
        {SCAN_STEPS.map((s, i) => {
          const ok = finished || done.includes(s.key);
          return <View key={s.key} style={[st.dot, ok && { backgroundColor: finished ? GREEN : GOLD, width: 22 }, !ok && i === step && { backgroundColor: "rgba(255,255,255,0.7)" }]} />;
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  topTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  topCount: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", width: 40, textAlign: "right" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: -0.4 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", lineHeight: 19 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: "rgba(216,173,106,0.16)" },
  hintText: { color: "#F3D49B", fontSize: 13, fontWeight: "600" },
  dots: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
});
