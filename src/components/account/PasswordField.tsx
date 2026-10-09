import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Field } from "../../kit";
import { colors } from "../../theme";

export function PasswordField(p: { label: string; value: string; onChangeText: (v: string) => void; error?: string; placeholder?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Field {...p} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} style={{ paddingRight: 50 }} />
      <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={{ position: "absolute", right: 14, top: 36 }}>
        <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
      </Pressable>
    </View>
  );
}
