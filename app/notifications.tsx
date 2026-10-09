import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { relTime } from "../src/components/account/constants";
import { Empty, Screen } from "../src/kit";
import { useDB } from "../src/store";
import { colors, radius, shadow, type } from "../src/theme";
import { NotificationType } from "../src/types";
import { Press } from "../src/ui";

const ICON: Record<NotificationType, [keyof typeof Ionicons.glyphMap, string, string]> = {
  info: ["information-circle", "#3B82F6", "#E3EEFF"],
  success: ["checkmark-circle", colors.success, "#DDF5E8"],
  warning: ["warning", "#B7791F", "#FFF3D6"],
  error: ["alert-circle", "#C53030", "#FDE7E7"],
  promotion: ["megaphone", "#8B5CF6", "#EFE7FF"],
  proposal: ["briefcase", colors.primary, colors.primarySoft],
  payment: ["wallet", colors.success, "#DDF5E8"],
};

export default function Notifications() {
  const userId = useDB((s) => s.userId);
  const notifications = useDB((s) => s.notifications);
  const markRead = useDB((s) => s.markRead);
  const markAllRead = useDB((s) => s.markAllRead);
  const mine = useMemo(() => notifications.filter((n) => n.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)), [notifications, userId]);
  const unread = mine.filter((n) => !n.is_read).length;

  if (!userId) return <Redirect href="/" />;

  return (
    <Screen
      title="Notifications"
      subtitle={unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Tout est à jour"}
      right={
        unread ? (
          <Press onPress={markAllRead} style={styles.allBtn}>
            <Ionicons name="checkmark-done" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 11 }}>Tout marquer comme lu</Text>
          </Press>
        ) : undefined
      }
    >
      {mine.length === 0 ? (
        <Empty icon="notifications-off-outline" title="Aucune notification" text="Vous serez notifié des propositions, messages et paiements." />
      ) : (
        mine.map((n, i) => {
          const [icon, fg, bg] = ICON[n.type];
          return (
            <Animated.View key={n.id} entering={FadeInDown.delay(Math.min(i, 10) * 40).springify()} layout={LinearTransition.springify()}>
              <Press onPress={() => !n.is_read && markRead(n.id)} scaleTo={0.98} style={[styles.row, shadow.soft, !n.is_read && { backgroundColor: "#FFF8F5", borderColor: colors.primarySoft }]}>
                <View style={[styles.icon, { backgroundColor: bg }]}>
                  <Ionicons name={icon} size={20} color={fg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.h3, { fontSize: 13 }, n.is_read && { fontWeight: "600" }]}>{n.title}</Text>
                  <Text style={type.small} numberOfLines={3}>
                    {n.message}
                  </Text>
                  <Text style={[type.tiny, { marginTop: 2 }]}>{relTime(n.created_at)}</Text>
                </View>
                {!n.is_read ? <View style={styles.dot} /> : null}
              </Press>
            </Animated.View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: "transparent" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
  allBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 34, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
});
