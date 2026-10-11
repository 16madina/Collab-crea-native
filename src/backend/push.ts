// Notifications push : enregistrement du téléphone (jeton Expo → table push_tokens) et ouverture
// de l'écran concerné quand on touche une notification. L'envoi est fait côté serveur
// (déclencheurs SQL → fonction send-push-notification).
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

/** Demande l'autorisation puis enregistre le jeton du téléphone pour l'utilisateur connecté. */
export async function registerForPush(userId: string) {
  try {
    if (!Device.isDevice || Platform.OS === "web") return;
    // Le jeton Expo nécessite l'identifiant du projet EAS (ajouté par « eas init »).
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("default", { name: "Collab Créa", importance: Notifications.AndroidImportance.HIGH, lightColor: "#D9AC65" });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase
      .from("push_tokens")
      .upsert({ user_id: userId, token, platform: Platform.OS, device_info: Device.modelName ?? null, updated_at: new Date().toISOString() }, { onConflict: "user_id,token" });
  } catch (e) {
    console.warn("[push]", (e as Error).message);
  }
}

/** Touche sur une notification → écran indiqué par le serveur (data.route), sinon les notifications. */
export function listenNotificationTaps() {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const d = (r.notification.request.content.data ?? {}) as Record<string, string | undefined>;
    // Les déclencheurs SQL envoient les routes de la version web : on les traduit vers les écrans natifs.
    const to = d.collaboration_id
      ? `/collab/${d.collaboration_id}`
      : d.conversation_id
        ? `/chat/${d.conversation_id}`
        : d.offer_id
          ? `/offer/${d.offer_id}`
          : d.route?.includes("wallet")
            ? "/wallet"
            : d.route?.startsWith("/admin")
              ? "/admin"
              : d.route?.includes("collabs")
                ? "/(tabs)/collabs"
                : "/notifications";
    router.push(to as never);
  });
  return () => sub.remove();
}
