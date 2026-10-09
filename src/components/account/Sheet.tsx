// Feuille modale inférieure réutilisable (panneau arrondi, poignée, défilement, clavier).
import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, type } from "../../theme";
import { Press } from "../../ui";

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
  maxHeight = 0.88,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  maxHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  const H = Dimensions.get("window").height * maxHeight;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,12,8,0.45)" }]} onPress={onClose} />
        </Animated.View>
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <Animated.View entering={SlideInDown.springify().damping(18).stiffness(160)} style={[styles.panel, { maxHeight: H, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={type.h2}>{title}</Text>
                {subtitle ? <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text> : null}
              </View>
              <Press onPress={onClose} style={styles.close} scaleTo={0.9}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </Press>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 14, flexShrink: 1 }}>{children}</View>
          )}
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 8 },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#DCCFC6", marginBottom: 8 },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
