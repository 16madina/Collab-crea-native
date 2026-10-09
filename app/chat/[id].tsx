import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { conversations, messages as seed } from "../../src/data";
import { colors, radius, type } from "../../src/theme";
import { Avatar, Glass, IconButton, Press } from "../../src/ui";

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const convo = conversations.find((c) => c.id === id) ?? conversations[0];
  const insets = useSafeAreaInsets();
  const [list, setList] = useState(seed);
  const [text, setText] = useState("");
  const scroll = useRef<ScrollView>(null);

  const send = () => {
    if (!text.trim()) return;
    setList((l) => [...l, { id: String(Date.now()), me: true, text: text.trim(), time: "Maintenant" }]);
    setText("");
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Glass style={[styles.header, { paddingTop: insets.top + 8 }]} intensity={60}>
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Avatar uri={convo.avatar} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{convo.name}</Text>
          <Text style={[type.tiny, { color: convo.online ? colors.success : colors.muted }]}>{convo.online ? "En ligne" : convo.campaign}</Text>
        </View>
        <IconButton name="ellipsis-horizontal" />
      </Glass>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 16, gap: 8, paddingTop: insets.top + 90 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
      >
        <View style={styles.campaignPill}>
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12 }}>{convo.campaign}</Text>
        </View>
        {list.map((m) => (
          <Animated.View key={m.id} entering={FadeInUp.springify()} style={[styles.bubble, m.me ? styles.mine : styles.theirs]}>
            <Text style={{ color: m.me ? "#fff" : colors.ink, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
            <Text style={{ fontSize: 10, marginTop: 4, alignSelf: "flex-end", color: m.me ? "rgba(255,255,255,0.75)" : colors.muted }}>{m.time}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Press style={styles.attach}>
          <Ionicons name="add" size={24} color={colors.ink} />
        </Press>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écrire un message…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Press onPress={send} style={[styles.send, !text.trim() && { opacity: 0.5 }]} scaleTo={0.85}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderRadius: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "rgba(251,244,239,0.8)",
  },
  campaignPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: 10,
  },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  composer: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 10, backgroundColor: colors.bg },
  attach: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minWidth: 0, height: 46, borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: 18, fontSize: 15, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
});
