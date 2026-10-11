// Ouverte par les liens des emails Supabase (collabcrea://auth-callback) : confirmation d'inscription,
// mot de passe oublié, changement d'email. On récupère la session puis on oriente l'utilisateur.
import { getQueryParams } from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { errMsg, supabase } from "../src/backend/supabase";
import { toast } from "../src/kit";
import { connect } from "../src/store";
import { colors } from "../src/theme";

export default function AuthCallback() {
  const url = Linking.useURL();
  const done = useRef(false);

  useEffect(() => {
    if (!url || done.current) return;
    done.current = true;
    void (async () => {
      const { params, errorCode } = getQueryParams(url);
      if (errorCode || params.error_description) {
        toast(params.error_description?.replace(/\+/g, " ") || "Lien invalide ou expiré", "error");
        return router.replace("/auth/login");
      }
      let userId: string | undefined;
      if (params.code) {
        const r = await supabase.auth.exchangeCodeForSession(params.code);
        if (r.error) toast(errMsg(r.error), "error");
        userId = r.data.user?.id;
      } else if (params.access_token && params.refresh_token) {
        const r = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
        if (r.error) toast(errMsg(r.error), "error");
        userId = r.data.user?.id;
      }
      if (!userId) return router.replace("/auth/login");
      await connect(userId);
      if (params.type === "recovery") return router.replace("/auth/reset");
      toast(params.type === "email_change" ? "Nouvel email confirmé ✅" : "Email confirmé, bienvenue ! ✅");
      router.replace("/(tabs)/home");
    })();
  }, [url]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 14 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.inkSoft }}>Connexion en cours…</Text>
    </View>
  );
}
