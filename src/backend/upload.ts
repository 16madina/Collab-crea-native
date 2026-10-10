// Téléversement de fichiers vers Supabase Storage (galerie / caméra du téléphone).
import * as ImagePicker from "expo-image-picker";
import { useDB } from "../store";
import { errMsg, supabase } from "./supabase";

export type Bucket = "avatars" | "offer-images" | "portfolio" | "collaboration-content" | "identity-documents" | "selfies" | "social-screenshots";
const PUBLIC: Bucket[] = ["avatars", "offer-images", "portfolio"];

export type Picked = { uri: string; mime: string; name: string; kind: "image" | "video" };

/** Ouvre la galerie (ou l'appareil photo) et renvoie le fichier choisi. */
export async function pickMedia(kind: "image" | "video" | "all" = "image", opts: { camera?: boolean; square?: boolean } = {}): Promise<Picked | null> {
  const perm = opts.camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(opts.camera ? "Autorise l'accès à l'appareil photo dans les réglages" : "Autorise l'accès à tes photos dans les réglages");
  const mediaTypes: ImagePicker.MediaType[] = kind === "all" ? ["images", "videos"] : [kind === "video" ? "videos" : "images"];
  const options: ImagePicker.ImagePickerOptions = { mediaTypes, quality: 0.85, allowsEditing: !!opts.square, aspect: opts.square ? [1, 1] : undefined, videoMaxDuration: 180 };
  const res = opts.camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const isVideo = a.type === "video";
  const mime = a.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg");
  const ext = (a.fileName?.split(".").pop() ?? mime.split("/")[1] ?? (isVideo ? "mp4" : "jpg")).toLowerCase();
  return { uri: a.uri, mime, name: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`, kind: isVideo ? "video" : "image" };
}

/**
 * Envoie un fichier dans `bucket` sous `{userId}/{sous-dossier}/…` (règle des buckets : dossier = propriétaire).
 * Renvoie l'URL publique pour les buckets publics, sinon le chemin (à lire avec `signedUrl`).
 */
export async function uploadFile(bucket: Bucket, file: Picked, sub?: string, owner?: string): Promise<string> {
  const uid = owner ?? useDB.getState().userId;
  if (!uid) throw new Error("Connecte-toi d'abord");
  const path = [uid, sub, file.name].filter(Boolean).join("/");
  const body = await (await fetch(file.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: file.mime, upsert: false });
  if (error) throw new Error(errMsg(error));
  return PUBLIC.includes(bucket) ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : path;
}

/** Choisit puis envoie un fichier ; renvoie l'URL / le chemin, ou null si annulé. */
export async function pickAndUpload(bucket: Bucket, kind: "image" | "video" | "all" = "image", sub?: string, opts: { camera?: boolean; square?: boolean; owner?: string } = {}) {
  const f = await pickMedia(kind, opts);
  if (!f) return null;
  return uploadFile(bucket, f, sub, opts.owner);
}

/** Lien temporaire (10 min) vers un fichier privé ; les URL complètes sont renvoyées telles quelles. */
export async function signedUrl(bucket: Bucket, pathOrUrl: string, seconds = 600) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, seconds);
  if (error) throw new Error(errMsg(error));
  return data.signedUrl;
}

export const isLive = () => useDB.getState().mode === "live";
