// Mise en page commune aux écrans d'authentification.
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type } from "../../theme";
import { IconButton } from "../../ui";
import { Image } from "expo-image";

const BADGE = require("../../../assets/logo.png");

export function AuthShell({ title, subtitle, children, onBack, top, eyebrow }: { title: string; subtitle?: string; children: ReactNode; onBack?: () => void; top?: ReactNode; eyebrow?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[colors.bg, colors.bgDeep]} style={StyleSheet.absoluteFill} />
      <View style={styles.orb} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 22, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton name="chevron-back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} />
        </View>
        <Animated.View entering={FadeInDown.springify()} style={{ alignItems: "center", marginTop: -36 }}>
          <Image source={BADGE} style={{ width: 120, height: 120 }} contentFit="contain" accessibilityLabel="Collab Créa" />
        </Animated.View>
        {top}
        <Animated.View entering={FadeInDown.springify()} style={{ gap: 6, marginTop: 6 }}>
          {eyebrow ? <Text style={{ color: colors.primary, fontWeight: "800", letterSpacing: 2, fontSize: 11 }}>{eyebrow}</Text> : null}
          <Text style={type.h1}>{title}</Text>
          {subtitle ? <Text style={type.body}>{subtitle}</Text> : null}
        </Animated.View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  orb: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: colors.primary, opacity: 0.08, right: -90, top: -60 },
});
