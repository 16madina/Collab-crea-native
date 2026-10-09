// Petits composants partagés : sélecteur de pays, interrupteur, ligne de réglage, onglets, bannière de vérification.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { Country } from "../../countries";
import { Label } from "../../kit";
import { colors, radius, shadow, type } from "../../theme";
import { Profile } from "../../types";
import { Press } from "../../ui";
import { Sheet } from "./Sheet";

/** Champ qui ouvre une feuille de recherche de pays (drapeaux). */
export function CountrySelect({
  label,
  countries,
  value,
  onChange,
  error,
  placeholder = "Sélectionner un pays",
}: {
  label: string;
  countries: Country[];
  value?: string; // nom du pays
  onChange: (c: Country) => void;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = countries.find((c) => c.name === value);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? countries.filter((c) => c.name.toLowerCase().includes(n) || c.code.toLowerCase() === n) : countries;
  }, [q, countries]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Press onPress={() => setOpen(true)} scaleTo={0.98} style={[styles.select, !!error && { borderColor: "#E5484D" }]}>
        <Text style={{ fontSize: 18 }}>{sel?.flag ?? "🌍"}</Text>
        <Text style={{ flex: 1, fontSize: 13, color: sel ? colors.ink : colors.muted }}>{sel?.name ?? value ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Press>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} scroll={false}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un pays…" placeholderTextColor={colors.muted} style={{ flex: 1, fontSize: 13, color: colors.ink }} autoCorrect={false} />
        </View>
        <FlatList
          data={list}
          keyExtractor={(c) => c.code}
          style={{ maxHeight: 440 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          renderItem={({ item }) => {
            const on = item.name === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.countryRow, (pressed || on) && { backgroundColor: colors.primarySoft }]}
              >
                <Text style={{ fontSize: 19 }}>{item.flag}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: colors.ink, fontWeight: on ? "700" : "500" }}>{item.name}</Text>
                <Text style={type.small}>{item.phoneCode}</Text>
                {on ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={[type.small, { textAlign: "center", padding: 20 }]}>Aucun pays trouvé</Text>}
        />
      </Sheet>
    </View>
  );
}

/** Liste déroulante simple dans une feuille. */
export function SelectField({ label, value, options, onChange, placeholder = "Choisir…" }: { label: string; value?: string; options: readonly string[]; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Press onPress={() => setOpen(true)} scaleTo={0.98} style={styles.select}>
        <Text style={{ flex: 1, fontSize: 13, color: value ? colors.ink : colors.muted }}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Press>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => {
              onChange(o);
              setOpen(false);
            }}
            style={({ pressed }) => [styles.countryRow, (pressed || o === value) && { backgroundColor: colors.primarySoft }]}
          >
            <Text style={{ flex: 1, fontSize: 13, color: colors.ink, fontWeight: o === value ? "700" : "500" }}>{o}</Text>
            {o === value ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: "#E6DAD2" }} thumbColor="#fff" ios_backgroundColor="#E6DAD2" />;
}

export function SettingRow({
  icon,
  label,
  sub,
  onPress,
  right,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.setRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
      <View style={[styles.setIcon, danger && { backgroundColor: "#FDE7E7" }]}>
        <Ionicons name={icon} size={18} color={danger ? "#C53030" : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: danger ? "#C53030" : colors.ink }}>{label}</Text>
        {sub ? <Text style={type.tiny}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} scaleTo={0.985}>
      {body}
    </Press>
  ) : (
    body
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[type.tiny, { letterSpacing: 1.2, marginLeft: 6 }]}>{title.toUpperCase()}</Text>
      <View style={[styles.group, shadow.soft]}>{children}</View>
    </View>
  );
}

/** Barre d'onglets horizontale en pilule. */
export function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: readonly { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Press key={t.key} onPress={() => onChange(t.key)} scaleTo={0.94} style={[styles.pill, on && styles.pillOn]}>
            <Text style={{ fontWeight: "700", fontSize: 11, color: on ? "#fff" : colors.ink }}>{t.label}</Text>
            {t.count != null ? (
              <View style={[styles.pillCount, on && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: on ? "#fff" : colors.primary }}>{t.count}</Text>
              </View>
            ) : null}
          </Press>
        );
      })}
    </Animated.ScrollView>
  );
}

export function Checkbox({ value, onChange, children }: { value: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Press onPress={() => onChange(!value)} scaleTo={0.98} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View style={[styles.check, value && { backgroundColor: colors.primary, borderColor: colors.primary }]}>{value ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </Press>
  );
}

export type VerifState = "verified" | "email" | "pending" | "identity";
export function verifState(p: Profile): VerifState {
  if (!p.email_verified) return "email";
  if (p.role === "brand") return "verified";
  if (p.identity_verified) return "verified";
  if (p.identity_submitted_at) return "pending";
  return "identity";
}

export function VerifBadge({ p }: { p: Profile }) {
  const s = verifState(p);
  const m = {
    verified: ["Vérifié", "checkmark-circle", colors.success, "#DDF5E8"],
    email: ["Email non vérifié", "mail-unread-outline", "#B7791F", "#FFF3D6"],
    pending: ["En attente", "time-outline", "#B7791F", "#FFF3D6"],
    identity: ["Identité non vérifiée", "shield-outline", "#C53030", "#FDE7E7"],
  }[s] as [string, keyof typeof Ionicons.glyphMap, string, string];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: m[3], paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
      <Ionicons name={m[1]} size={14} color={m[2]} />
      <Text style={{ color: m[2], fontWeight: "700", fontSize: 11 }}>{m[0]}</Text>
    </View>
  );
}

/** Bannière d'incitation à la vérification (email puis identité pour les créateurs). */
export function VerificationBanner({ p }: { p: Profile }) {
  const s = verifState(p);
  if (s === "verified") return null;
  const cfg = {
    email: { icon: "mail-outline", title: "Vérifiez votre email", text: p.role === "brand" ? "Requis pour contacter les créateurs." : "Confirmez votre adresse pour sécuriser votre compte.", cta: "Vérifier" },
    identity: { icon: "shield-checkmark-outline", title: "Vérifiez votre identité", text: "Requis pour postuler aux offres et envoyer des messages.", cta: "Commencer" },
    pending: { icon: "hourglass-outline", title: "Vérification en cours", text: "Notre équipe examine votre demande sous 24–48 h.", cta: "Voir" },
  }[s] as { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; cta: string };
  return (
    <Animated.View entering={FadeIn} layout={LinearTransition.springify()}>
      <Press onPress={() => router.push("/verification/identity")} scaleTo={0.98} style={[styles.vb, shadow.soft]}>
        <View style={styles.vbIcon}>
          <Ionicons name={cfg.icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>{cfg.title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 }}>{cfg.text}</Text>
        </View>
        <View style={styles.vbCta}>
          <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 11 }}>{cfg.cta}</Text>
        </View>
      </Press>
    </Animated.View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={value >= i ? "star" : value >= i - 0.5 ? "star-half" : "star-outline"} size={size} color="#F5A524" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  select: { height: 52, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  error: { color: "#E5484D", fontSize: 11, fontWeight: "600" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 48, borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line },
  countryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.md },
  setRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  setIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pillOn: { backgroundColor: colors.night, borderColor: colors.night },
  pillCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginTop: 1 },
  vb: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.night },
  vbIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  vbCta: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
});
