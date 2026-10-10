// Image d'un bucket privé (pièces d'identité, selfies, captures) : affichée via un lien signé temporaire.
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";
import { signedUrl, type Bucket } from "../backend/upload";
import { supabase } from "../backend/supabase";
import { colors } from "../theme";

export function PrivateImage({ bucket, path, style }: { bucket: Bucket; path?: string | number; style?: StyleProp<ViewStyle> }) {
  const [url, setUrl] = useState<string | number | null>(typeof path === "number" ? path : null);
  useEffect(() => {
    if (typeof path !== "string" || !path) return;
    signedUrl(bucket, path).then(setUrl).catch(() => setUrl(null));
  }, [bucket, path]);
  if (!path) return null;
  return url ? <Image source={url} style={style as never} contentFit="cover" /> : <View style={[style, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={colors.primary} /></View>;
}

/** Tous les fichiers d'un dossier privé (ex. les 4 selfies d'identité). */
export function PrivateFolder({ bucket, folder, style }: { bucket: Bucket; folder: string; style?: StyleProp<ViewStyle> }) {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    void supabase.storage
      .from(bucket)
      .list(folder, { limit: 10, sortBy: { column: "created_at", order: "desc" } })
      .then(({ data }) => setPaths((data ?? []).slice(0, 4).map((f) => `${folder}/${f.name}`)));
  }, [bucket, folder]);
  return (
    <>
      {paths.map((p) => (
        <PrivateImage key={p} bucket={bucket} path={p} style={style} />
      ))}
    </>
  );
}
