import { useEffect } from "react";
import { Platform } from "react-native";
import { PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic, useFonts } from "@expo-google-fonts/playfair-display";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastHost } from "../src/kit";
import { colors } from "../src/theme";

export default function RootLayout() {
  useFonts({ PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic });
  // Toucher une notification push ouvre l'écran concerné.
  useEffect(() => {
    if (Platform.OS === "web") return;
    let off: (() => void) | undefined;
    void import("../src/backend/push").then((p) => (off = p.listenNotificationTaps()));
    return () => off?.();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="create" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
      </Stack>
      <ToastHost />
    </GestureHandlerRootView>
  );
}
