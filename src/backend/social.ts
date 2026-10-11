// Connexion avec Apple (identifiant natif) ou Google (OAuth Supabase dans le navigateur sécurisé).
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import { getQueryParams } from "expo-auth-session/build/QueryParams";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { errMsg, supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type SocialResult = { ok: true; userId: string; isNew: boolean; name?: string } | { ok: false; error: string; cancelled?: boolean };

const newUser = (createdAt?: string) => !!createdAt && Date.now() - new Date(createdAt).getTime() < 60_000;

export const appleAvailable = () => (Platform.OS === "ios" ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false));

export async function signInWithApple(): Promise<SocialResult> {
  try {
    const rawNonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!cred.identityToken) return { ok: false, error: "Connexion Apple impossible" };
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce: rawNonce });
    if (error || !data.user) return { ok: false, error: errMsg(error) };
    // Apple ne donne le nom qu'à la première connexion : on le garde.
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ") || undefined;
    return { ok: true, userId: data.user.id, isNew: newUser(data.user.created_at), name };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ERR_REQUEST_CANCELED") return { ok: false, error: "", cancelled: true };
    return { ok: false, error: errMsg(e) };
  }
}

export async function signInWithGoogle(): Promise<SocialResult> {
  try {
    const redirectTo = makeRedirectUri({ scheme: "collabcrea", path: "auth-callback" });
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data.url) return { ok: false, error: errMsg(error) };
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== "success") return { ok: false, error: "", cancelled: true };
    const { params, errorCode } = getQueryParams(res.url);
    if (errorCode) return { ok: false, error: errorCode };
    let user;
    if (params.code) {
      const r = await supabase.auth.exchangeCodeForSession(params.code);
      if (r.error) return { ok: false, error: errMsg(r.error) };
      user = r.data.user;
    } else if (params.access_token && params.refresh_token) {
      const r = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
      if (r.error) return { ok: false, error: errMsg(r.error) };
      user = r.data.user;
    }
    if (!user) return { ok: false, error: "Connexion Google impossible" };
    return { ok: true, userId: user.id, isNew: newUser(user.created_at), name: (user.user_metadata?.full_name as string) || undefined };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
