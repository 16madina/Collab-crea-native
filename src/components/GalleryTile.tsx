// Tuile « Depuis ma galerie » ajoutée aux sélecteurs de photos (mode en ligne uniquement).
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { isLive, pickAndUpload, type Bucket } from "../backend/upload";
import { toast } from "../kit";
import { colors } from "../theme";
import { Press } from "../ui";

export function GalleryTile({
  bucket,
  kind = "image",
  sub,
  square,
  onUploaded,
  style,
  label = "Ma galerie",
}: {
  bucket: Bucket;
  kind?: "image" | "video" | "all";
  sub?: string;
  square?: boolean;
  onUploaded: (url: string) => void;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!isLive()) return null;
  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const url = await pickAndUpload(bucket, kind, sub, { square });
      if (url) onUploaded(url);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Press onPress={go} style={[styles.tile, style]} scaleTo={0.95}>
      {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={kind === "video" ? "videocam-outline" : "images-outline"} size={24} color={colors.primary} />}
      <Text style={styles.text}>{busy ? "Envoi…" : label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  tile: { width: 92, height: 92, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primarySoft },
  text: { color: colors.ink, fontSize: 10, fontWeight: "700", textAlign: "center" },
});
