import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, type } from "../../theme";
import { Press } from "../../ui";

export function Sheet({ visible, onClose, title, children, footer }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.panel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.grabber} />
          {title ? (
            <View style={s.head}>
              <Text style={[type.h2, { flex: 1 }]} numberOfLines={2}>{title}</Text>
              <Press onPress={onClose} style={s.close}><Ionicons name="close" size={20} color={colors.ink} /></Press>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: { marginTop: "auto", maxHeight: "90%", backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "#D9CBC2", marginTop: 10 },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
