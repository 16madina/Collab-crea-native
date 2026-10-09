// Feuille modale réutilisable (bas d'écran) : panneau blanc arrondi + poignée, défilable, compatible clavier.
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type } from "../../theme";
import { Press } from "../../ui";

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={type.h2}>{title}</Text>
                {subtitle ? <Text style={type.small}>{subtitle}</Text> : null}
              </View>
              <Press onPress={onClose} style={styles.close} scaleTo={0.85}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </Press>
            </View>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,10,10,0.45)" },
  panel: {
    maxHeight: "90%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  grabber: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "#DCCFC7", marginTop: 10, marginBottom: 6 },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, gap: 12 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1E8E2", alignItems: "center", justifyContent: "center" },
});
