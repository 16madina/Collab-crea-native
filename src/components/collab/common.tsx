// Petits composants et sélecteurs partagés par les écrans offres / collaborations / messagerie.
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { africanCountries, worldCountries } from "../../countries";
import { Badge } from "../../kit";
import { colors, radius, type } from "../../theme";
import type { ApplicationStatus, CollabStatus, Profile } from "../../types";
import { Press } from "../../ui";

export const OFFER_CATEGORIES = ["Beauté", "Tech", "Cuisine", "Fitness", "Mode", "Lifestyle", "Voyage", "Gaming", "Musique", "Humour", "Éducation", "Business"] as const;
export const OFFER_CONTENT_TYPES = ["Reel", "Story", "TikTok", "Vidéo YouTube", "Post Instagram", "Thread Twitter", "Article Blog", "Podcast"] as const;

export const flagOf = (country?: string) => {
  if (!country) return "🌍";
  const c = [...africanCountries, ...worldCountries].find((x) => x.name.toLowerCase() === country.toLowerCase());
  return c?.flag ?? "🌍";
};

export function SearchBar({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder: string; style?: object }) {
  return (
    <View style={[styles.search, style]}>
      <Ionicons name="search-outline" size={20} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} returnKeyType="search" />
      {value ? (
        <Press onPress={() => onChange("")} scaleTo={0.8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Press>
      ) : null}
    </View>
  );
}

export function AppStatusBadge({ status }: { status?: ApplicationStatus }) {
  if (!status) return <Badge label="Nouveau" tone="primary" />;
  if (status === "pending") return <Badge label="En attente" tone="warning" />;
  if (status === "accepted") return <Badge label="Accepté" tone="success" />;
  return <Badge label="Refusé" tone="danger" />;
}

export const collabTone = (s: CollabStatus): "primary" | "success" | "warning" | "danger" | "muted" | "dark" =>
  s === "completed"
    ? "success"
    : s === "pending_payment" || s === "revision_requested"
      ? "warning"
      : ["refused", "cancelled", "expired", "refunded"].includes(s)
        ? "danger"
        : s === "content_submitted" || s === "publication_submitted"
          ? "dark"
          : "primary";

export const nameOf = (p?: Profile) => (p ? (p.role === "brand" ? p.company_name || p.full_name : p.full_name) : "Utilisateur");
export const avatarOf = (p?: Profile) => p?.logo_url || p?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=70";

export function StatTile({ icon, label, value, dark }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; dark?: boolean }) {
  return (
    <View style={[styles.stat, dark && { backgroundColor: colors.night }]}>
      <View style={[styles.statIcon, dark && { backgroundColor: "rgba(255,90,54,0.2)" }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[type.h2, dark && { color: "#fff" }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[type.tiny, dark && { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function InfoBox({ icon = "information-circle", children }: { icon?: keyof typeof Ionicons.glyphMap; children: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[type.small, { flex: 1, color: colors.inkSoft }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, borderRadius: radius.pill, paddingHorizontal: 18, backgroundColor: "#F1E8E2" },
  input: { flex: 1, fontSize: 13, color: colors.ink },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 4 },
  statIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  info: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: "#FFF1EB", alignItems: "flex-start" },
});
