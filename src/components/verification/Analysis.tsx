// Écran « Vérification en cours… » : anneau qui tourne autour d'un bouclier, pourcentage, et liste
// d'étapes qui se cochent une à une. `task` (ex. l'envoi des photos) doit être terminée avant la dernière coche.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { GOLD, GREEN } from "./scanShared";

const SIZE = 168;
const R = 72;
const C = 2 * Math.PI * R;
const STEP_MS = 1100;

export function Analysis({
  title,
  doneTitle,
  steps,
  task,
  onDone,
  onError,
}: {
  title: string;
  doneTitle: string;
  steps: string[];
  task?: () => Promise<void>;
  onDone: () => void;
  onError?: (message: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0); // étape en cours ; steps.length = tout est validé
  const [pct, setPct] = useState(0);
  const taskRef = useRef<Promise<void> | null>(null);
  const finished = active >= steps.length;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  useEffect(() => {
    taskRef.current = task ? task() : Promise.resolve();
    taskRef.current.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avance d'une étape toutes les ~1 s ; la dernière attend la fin de la tâche.
  useEffect(() => {
    if (finished) {
      const t = setTimeout(onDone, 1400);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const t = setTimeout(() => {
      const last = active === steps.length - 1;
      const go = () => !cancelled && setActive((a) => a + 1);
      if (!last) return go();
      taskRef.current!.then(go, (e: Error) => !cancelled && onError?.(e.message || "Une erreur est survenue"));
    }, STEP_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, finished]);

  // Pourcentage qui monte doucement vers l'étape suivante.
  useEffect(() => {
    const target = finished ? 100 : Math.round(((active + 0.85) / steps.length) * 100);
    const t = setInterval(() => setPct((p) => (p < target ? p + 1 : p)), 16);
    return () => clearInterval(t);
  }, [active, finished, steps.length]);

  return (
    <View style={[StyleSheet.absoluteFill, st.wrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 30 }]}>
      <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={finished ? GREEN : GOLD}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        {!finished ? (
          <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
            <Svg width={SIZE} height={SIZE}>
              <Defs>
                <SvgGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={GOLD} stopOpacity="0" />
                  <Stop offset="1" stopColor={GOLD} stopOpacity="0.9" />
                </SvgGradient>
              </Defs>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R + 14} stroke="url(#g)" strokeWidth={2} fill="none" strokeDasharray={`${C * 0.3} ${C}`} strokeLinecap="round" />
            </Svg>
          </Animated.View>
        ) : null}
        {finished ? (
          <Animated.View entering={ZoomIn.duration(360)} style={[st.badge, { backgroundColor: GREEN }]}>
            <Ionicons name="checkmark" size={54} color="#fff" />
          </Animated.View>
        ) : (
          <View style={st.badge}>
            <Ionicons name="shield-half-outline" size={40} color={GOLD} />
            <Text style={st.pct}>{pct} %</Text>
          </View>
        )}
      </View>

      <Animated.Text key={finished ? "ok" : "wait"} entering={FadeInDown.duration(300)} style={st.title}>
        {finished ? doneTitle : title}
      </Animated.Text>

      <View style={st.list}>
        {steps.map((label, i) => {
          const ok = i < active;
          const now = i === active;
          return (
            <Animated.View key={label} entering={FadeInDown.delay(i * 90).duration(300)} style={st.row}>
              <View style={[st.dot, ok && { backgroundColor: GREEN, borderColor: GREEN }]}>
                {ok ? <Ionicons name="checkmark" size={14} color="#fff" /> : now ? <ActivityIndicator size="small" color={GOLD} /> : null}
              </View>
              <Text style={[st.rowText, (ok || now) && { color: "#fff" }]}>{label}</Text>
            </Animated.View>
          );
        })}
      </View>

      <View style={st.secure}>
        <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.5)" />
        <Text style={st.secureText}>{"Données chiffrées · visibles seulement par l'équipe de vérification"}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: "#0B0B0B", alignItems: "center", paddingHorizontal: 28, gap: 26 },
  badge: { width: 116, height: 116, borderRadius: 58, backgroundColor: "rgba(216,173,106,0.10)", alignItems: "center", justifyContent: "center", gap: 2 },
  pct: { color: "#fff", fontSize: 15, fontWeight: "800" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  list: { alignSelf: "stretch", gap: 16, paddingHorizontal: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  rowText: { color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "600", flex: 1 },
  secure: { marginTop: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  secureText: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center" },
});
