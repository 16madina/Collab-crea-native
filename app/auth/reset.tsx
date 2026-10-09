import { router } from "expo-router";
import { useState } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { PasswordField } from "../../src/components/account/PasswordField";
import { toast } from "../../src/kit";
import { Button } from "../../src/ui";

export default function Reset() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<{ pw?: string; confirm?: string }>({});

  const submit = () => {
    const e: typeof err = {};
    if (pw.length < 6) e.pw = "Minimum 6 caractères";
    if (confirm !== pw) e.confirm = "Les mots de passe ne correspondent pas";
    setErr(e);
    if (Object.keys(e).length) return;
    toast("Mot de passe mis à jour !");
    router.replace("/auth/login");
  };

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé d'au moins 6 caractères.">
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>
        <PasswordField label="Nouveau mot de passe" value={pw} onChangeText={setPw} error={err.pw} placeholder="••••••" />
        <PasswordField label="Confirmer le mot de passe" value={confirm} onChangeText={setConfirm} error={err.confirm} placeholder="••••••" />
        <Button label="Mettre à jour" icon="checkmark" onPress={submit} />
      </Animated.View>
    </AuthShell>
  );
}
