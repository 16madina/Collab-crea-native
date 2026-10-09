// Composants de formulaire et de mise en page partagés par tous les écrans.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect } from "react";
import { create } from "zustand";
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow, type } from "./theme";
import { Glass, IconButton, Press } from "./ui";

/** Écran avec en-tête en verre (retour + titre + action) et contenu défilant. */
export function Screen({
  title,
  subtitle,
  right,
  children,
  footer,
  back = true,
  scroll = true,
  contentStyle,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const headerH = insets.top + 64;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingTop: headerH + 8, paddingHorizontal: 20, paddingBottom: (footer ? 120 : 40) + insets.bottom, gap: 16 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: headerH }, contentStyle]}>{children}</View>
      )}
      <Glass style={[styles.header, { paddingTop: insets.top + 8 }]} intensity={60}>
        {back ? <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} /> : <View style={{ width: 4 }} />}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text style={[type.h2, { fontSize: 18 }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={type.tiny} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </Glass>
      {footer ? (
        <Glass style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]} intensity={70}>
          {footer}
        </Glass>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function Field({ label, error, hint, style, ...p }: TextInputProps & { label?: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...p}
        style={[styles.input, p.multiline && { height: 110, paddingTop: 14, textAlignVertical: "top" }, !!error && { borderColor: colors.danger }, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={type.tiny}>{hint}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Press onPress={onPress} style={[styles.chip, on && styles.chipOn]} scaleTo={0.94}>
      {icon ? <Ionicons name={icon} size={14} color={on ? colors.onPrimary : colors.ink} /> : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: on ? colors.onPrimary : colors.ink }}>{label}</Text>
    </Press>
  );
}

export function Chips<T extends string>({ options, value, onChange, multi }: { options: readonly (T | { value: T; label: string })[]; value: T | T[]; onChange: (v: any) => void; multi?: boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        const on = multi ? (value as T[]).includes(v) : value === v;
        return (
          <Chip
            key={v}
            label={l}
            on={on}
            onPress={() => (multi ? onChange(on ? (value as T[]).filter((x) => x !== v) : [...(value as T[]), v]) : onChange(v))}
          />
        );
      })}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Press key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, value === o.value && [styles.segOn, shadow.soft]]} scaleTo={0.97}>
          <Text style={[styles.segText, value === o.value && { color: colors.ink }]} numberOfLines={1}>
            {o.label}
          </Text>
        </Press>
      ))}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, shadow.soft, style]}>{children}</View>;
}

export function Empty({ icon = "sparkles-outline", title, text, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[type.h3, { textAlign: "center" }]}>{title}</Text>
      {text ? <Text style={[type.small, { textAlign: "center", maxWidth: 280 }]}>{text}</Text> : null}
      {action}
    </View>
  );
}

export function Banner({ tone = "info", icon, children }: { tone?: "info" | "success" | "warning" | "danger"; icon?: keyof typeof Ionicons.glyphMap; children: ReactNode }) {
  const c = { info: [colors.primarySoft, colors.primary], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger] }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: c[0] }]}>
      <Ionicons name={icon ?? (tone === "success" ? "checkmark-circle" : tone === "danger" ? "alert-circle" : tone === "warning" ? "time" : "information-circle")} size={20} color={c[1]} />
      <View style={{ flex: 1 }}>{typeof children === "string" ? <Text style={[type.small, { color: colors.inkSoft }]}>{children}</Text> : children}</View>
    </View>
  );
}

export function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={[type.small, bold && { color: colors.ink, fontWeight: "700" }]}>{label}</Text>
      <Text style={[{ color: colors.ink, fontWeight: bold ? "800" : "600" }]}>{value}</Text>
    </View>
  );
}

export function Badge({ label, tone = "primary" }: { label: string; tone?: "primary" | "success" | "warning" | "danger" | "muted" | "dark" }) {
  const c = {
    primary: [colors.primarySoft, colors.primary],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    muted: ["rgba(255,255,255,0.06)", colors.muted],
    dark: [colors.surfaceHi, colors.ink],
  }[tone];
  return (
    <View style={{ backgroundColor: c[0], borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Text style={{ color: c[1], fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

// ---------- toasts ----------
type ToastT = { id: number; text: string; tone: "success" | "error" | "info" };
const useToasts = create<{ list: ToastT[] }>(() => ({ list: [] }));
export const toast = (text: string, tone: ToastT["tone"] = "success") => {
  const id = Date.now() + Math.random();
  useToasts.setState((s) => ({ list: [...s.list, { id, text, tone }] }));
  setTimeout(() => useToasts.setState((s) => ({ list: s.list.filter((t) => t.id !== id) })), 2800);
};

export function ToastHost() {
  const list = useToasts((s) => s.list);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, gap: 8, zIndex: 999 }}>
      {list.map((t) => (
        <Animated.View key={t.id} entering={FadeInUp.springify()} exiting={FadeOutUp}>
          <Glass style={[styles.toast, shadow.soft]} tint="dark" intensity={50}>
            <Ionicons name={t.tone === "error" ? "alert-circle" : t.tone === "info" ? "information-circle" : "checkmark-circle"} size={20} color={t.tone === "error" ? "#FF8A80" : t.tone === "info" ? "#fff" : "#6EE7A8"} />
            <Text style={{ color: "#fff", fontWeight: "600", flex: 1 }}>{t.text}</Text>
          </Glass>
        </Animated.View>
      ))}
    </View>
  );
}

/** Redirige vers l'accueil si personne n'est connecté. */
export function useRequireAuth(userId: string | null) {
  useEffect(() => {
    if (!userId) router.replace("/");
  }, [userId]);
}

export const fmtDate = (iso?: string, withYear = false) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }) : "—";

export const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "Expiré", tone: "danger" as const };
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  if (d > 3) return { label: `${d}j ${h}h`, tone: "muted" as const };
  if (d >= 1) return { label: `${d}j ${h}h ${m}m`, tone: "warning" as const };
  return { label: `${h}h ${m}m`, tone: "danger" as const };
};

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderRadius: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "rgba(11,11,11,0.82)",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderRadius: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "rgba(18,18,18,0.86)",
  },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segment: { flexDirection: "row", backgroundColor: "#141414", borderRadius: radius.pill, padding: 4 },
  segItem: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segOn: { backgroundColor: colors.surface },
  segText: { fontWeight: "700", color: colors.muted, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", gap: 10, alignItems: "center", padding: 14, borderRadius: radius.md },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: "rgba(20,20,20,0.82)" },
});
