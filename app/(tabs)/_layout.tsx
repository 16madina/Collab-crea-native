import { useDB } from "../../src/store";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, Tabs } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, shadow } from "../../src/theme";
import { Press, tap } from "../../src/ui";

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap, string]> = {
  home: ["home", "home-outline", "Accueil"],
  offers: ["compass", "compass-outline", "Explorer"],
  collabs: ["chatbubble-ellipses", "chatbubble-ellipses-outline", "Messages"],
  profile: ["person", "person-outline", "Profil"],
};

function TabItem({ focused, name, onPress }: { focused: boolean; name: string; onPress: () => void }) {
  const [on, off, label] = ICONS[name];
  const userId = useDB((s) => s.userId);
  const messages = useDB((s) => s.messages);
  const conversations = useDB((s) => s.conversations);
  const badge =
    name === "collabs" && userId
      ? new Set(
          messages
            .filter((m) => m.sender_id !== userId && !m.read_at && conversations.some((c) => c.id === m.conversation_id && c.participants.includes(userId)))
            .map((m) => m.conversation_id),
        ).size
      : 0;
  const dot = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1 : 0, { damping: 14 }) }],
  }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(focused ? -2 : 0) }, { scale: withSpring(focused ? 1.08 : 1) }],
  }));
  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={6}>
      <Animated.View style={icon}>
        <Ionicons name={focused ? on : off} size={23} color={focused ? colors.primary : colors.inkSoft} />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[styles.label, focused && { color: colors.primary, fontWeight: "700" }]}>{label}</Text>
      <Animated.View style={[styles.dot, dot]} />
    </Pressable>
  );
}

function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const go = (i: number) => {
    const route = state.routes[i];
    tap();
    if (state.index !== i) navigation.navigate(route.name);
  };
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[styles.bar, shadow.soft]}>
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <TabItem focused={state.index === 0} name="home" onPress={() => go(0)} />
        <TabItem focused={state.index === 1} name="offers" onPress={() => go(1)} />
        <View style={{ width: 70 }} />
        <TabItem focused={state.index === 2} name="collabs" onPress={() => go(2)} />
        <TabItem focused={state.index === 3} name="profile" onPress={() => go(3)} />
      </View>
      <Press onPress={() => router.push(useDB.getState().userId ? "/create" : "/auth/signup")} style={[styles.fab, shadow.glow]} scaleTo={0.88}>
        <Ionicons name="add" size={32} color={colors.onPrimary} />
      </Press>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <GlassTabBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: "shift" }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="offers" />
      <Tabs.Screen name="collabs" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: { position: "absolute", top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#E2B873", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#111" },
  badgeText: { color: "#0B0B0B", fontSize: 9, fontWeight: "800" },
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, alignItems: "center" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 70,
    width: "100%",
    borderRadius: 35,
    overflow: "hidden",
    backgroundColor: "rgba(20,20,20,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, height: "100%" },
  label: { fontSize: 10, color: colors.inkSoft, fontWeight: "500" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, position: "absolute", bottom: 6 },
  fab: {
    position: "absolute",
    top: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
