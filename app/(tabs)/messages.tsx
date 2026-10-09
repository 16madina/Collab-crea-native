import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { conversations } from "../../src/data";
import { colors, radius, type } from "../../src/theme";
import { Avatar, Press } from "../../src/ui";

export default function Messages() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={type.h1}>Messages</Text>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput placeholder="Rechercher une conversation" placeholderTextColor={colors.muted} style={{ flex: 1, fontSize: 15 }} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 8 }}>
        {conversations.map((c) => (
          <Press key={c.id} onPress={() => router.push(`/chat/${c.id}`)} style={{ alignItems: "center", gap: 6, width: 64 }}>
            <View>
              <Avatar uri={c.avatar} size={58} ring={c.unread > 0} />
              {c.online && <View style={styles.online} />}
            </View>
            <Text style={type.tiny} numberOfLines={1}>
              {c.name}
            </Text>
          </Press>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
        {conversations.map((c, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(i * 60).springify()}>
            <Press onPress={() => router.push(`/chat/${c.id}`)} style={styles.row} scaleTo={0.98}>
              <Avatar uri={c.avatar} size={54} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={type.h3}>{c.name}</Text>
                  <Text style={[type.tiny, c.unread > 0 && { color: colors.primary }]}>{c.time}</Text>
                </View>
                <Text style={[type.tiny, { color: colors.primary }]}>{c.campaign}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[type.small, { flex: 1 }, c.unread > 0 && { color: colors.ink, fontWeight: "600" }]} numberOfLines={1}>
                    {c.last}
                  </Text>
                  {c.unread > 0 && (
                    <View style={styles.unread}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{c.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Press>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    backgroundColor: "#F1E8E2",
    marginVertical: 18,
  },
  online: { position: "absolute", right: 2, bottom: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: radius.lg },
  unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
});
