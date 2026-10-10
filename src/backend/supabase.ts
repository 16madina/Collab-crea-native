// Client Supabase (projet Collab Créa). La clé publiable est faite pour être embarquée dans l'app :
// la sécurité repose sur la RLS et les fonctions serveur (voir supabase/migrations).
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://qsbkwdtchhzclpxjrhnt.supabase.co";
export const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  "sb_publishable_RlsVGC_uc82nX5PSQd37TQ_iBRKsUkB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

/** Message d'erreur lisible (les fonctions SQL lèvent des messages en français). */
export const errMsg = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/Invalid login credentials/i.test(m))
    return "Email ou mot de passe incorrect";
  if (/Email not confirmed/i.test(m))
    return "Confirme ton email avant de te connecter";
  if (/already registered|already exists/i.test(m))
    return "Cet email est déjà utilisé";
  if (/row-level security/i.test(m)) return "Action non autorisée";
  return m.replace(/^.*?ERROR:\s*/, "");
};
