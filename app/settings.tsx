import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { isEmail } from "../src/components/account/constants";
import { Sheet } from "../src/components/account/Sheet";
import { Group, SettingRow, Toggle } from "../src/components/account/widgets";
import { Banner, Field, Screen, Segmented, toast } from "../src/kit";
import { useDB } from "../src/store";
import { colors, type } from "../src/theme";
import { Button } from "../src/ui";

const FAQ_URL = "/contact";

export default function Settings() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const signOut = useDB((s) => s.signOut);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);

  const [push, setPush] = useState(true);
  const [mail, setMail] = useState(true);
  const [visible, setVisible] = useState(true);
  const [online, setOnline] = useState(true);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [dark, setDark] = useState(false);
  const [sheet, setSheet] = useState<"email" | "delete" | "bug" | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailErr, setEmailErr] = useState<string>();
  const [confirm, setConfirm] = useState("");
  const [bug, setBug] = useState("");

  if (!me) return <Redirect href="/" />;

  const logout = () => {
    signOut();
    router.replace("/");
  };

  const changeEmail = () => {
    if (!isEmail(newEmail)) return setEmailErr("Email invalide");
    setEmailErr(undefined);
    setSheet(null);
    setNewEmail("");
    toast("Un lien de confirmation a été envoyé à la nouvelle adresse");
  };

  const del = () => {
    if (confirm !== "SUPPRIMER") return toast("Tapez SUPPRIMER pour confirmer", "error");
    setSheet(null);
    signOut();
    toast("Votre compte a été supprimé");
    router.replace("/");
  };

  const sections = [
    <Group key="compte" title="Compte">
      <SettingRow icon="mail-outline" label="Changer d'email" sub="Un lien de confirmation sera envoyé" onPress={() => setSheet("email")} />
      <SettingRow icon="paper-plane-outline" label="Renvoyer l'email de vérification" sub={me.email_verified ? "Email déjà vérifié" : "Email non vérifié"} onPress={() => toast(me.email_verified ? "Votre email est déjà vérifié" : "Email de vérification renvoyé", me.email_verified ? "info" : "success")} />
      <SettingRow icon="key-outline" label="Changer le mot de passe" onPress={() => router.push("/auth/reset")} />
      <SettingRow icon="log-out-outline" label="Déconnexion" onPress={logout} last />
    </Group>,
    <Group key="notifs" title="Notifications">
      <SettingRow icon="notifications-outline" label="Notifications push" sub="Propositions, messages, paiements" right={<Toggle value={push} onChange={setPush} />} />
      <SettingRow icon="mail-unread-outline" label="Notifications par email" right={<Toggle value={mail} onChange={setMail} />} last />
    </Group>,
    <Group key="privacy" title="Confidentialité">
      <SettingRow icon="eye-outline" label="Profil visible" sub="Apparaître dans les recherches des marques" right={<Toggle value={visible} onChange={setVisible} />} />
      <SettingRow icon="radio-button-on-outline" label="Statut en ligne" right={<Toggle value={online} onChange={setOnline} />} last />
    </Group>,
    <Group key="prefs" title="Préférences">
      <View style={{ padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Text style={{ fontWeight: "600", color: colors.ink }}>Langue</Text>
        <Segmented
          value={lang}
          onChange={(v) => {
            setLang(v);
            if (v === "en") toast("English version coming soon", "info");
          }}
          options={[
            { value: "fr", label: "Français" },
            { value: "en", label: "English" },
          ]}
        />
      </View>
      <SettingRow icon="moon-outline" label="Mode sombre" sub="Bientôt disponible" right={<Toggle value={dark} onChange={setDark} />} last />
    </Group>,
    <Group key="support" title="Support">
      <SettingRow icon="help-circle-outline" label="FAQ" onPress={() => router.push(FAQ_URL)} />
      <SettingRow icon="chatbubbles-outline" label="Contact" onPress={() => router.push("/contact")} />
      <SettingRow icon="bug-outline" label="Signaler un bug" onPress={() => setSheet("bug")} />
      <SettingRow icon="document-text-outline" label="Conditions générales" onPress={() => router.push("/legal/terms")} />
      <SettingRow icon="lock-closed-outline" label="Confidentialité" onPress={() => router.push("/legal/privacy")} last />
    </Group>,
    <Group key="danger" title="Zone sensible">
      <SettingRow icon="trash-outline" label="Supprimer mon compte" danger onPress={() => setSheet("delete")} last />
    </Group>,
  ];

  return (
    <Screen title="Paramètres" subtitle={me.role === "brand" ? me.company_name : me.full_name}>
      {sections.map((s, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(i * 60).springify()}>
          {s}
        </Animated.View>
      ))}
      <Text style={[type.tiny, { textAlign: "center" }]}>Collab Créa · version 1.0.0</Text>

      <Sheet visible={sheet === "email"} onClose={() => setSheet(null)} title="Changer d'email" footer={<Button label="Envoyer le lien" icon="send-outline" onPress={changeEmail} />}>
        <Field label="Nouvel email" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" placeholder="nouveau@exemple.com" error={emailErr} />
      </Sheet>

      <Sheet visible={sheet === "bug"} onClose={() => setSheet(null)} title="Signaler un bug" footer={<Button label="Envoyer" icon="send-outline" onPress={() => {
        if (bug.trim().length < 10) return toast("Décrivez le problème (10 caractères min.)", "error");
        setBug("");
        setSheet(null);
        toast("Merci ! Notre équipe va examiner le problème.");
      }} />}>
        <Field label="Que s'est-il passé ?" value={bug} onChangeText={setBug} multiline placeholder="Étapes pour reproduire, écran concerné…" />
      </Sheet>

      <Sheet visible={sheet === "delete"} onClose={() => setSheet(null)} title="Supprimer mon compte" footer={<Button label="Supprimer définitivement" icon="trash-outline" variant="dark" onPress={del} />}>
        <Banner tone="danger">Cette action est irréversible. Votre profil, vos offres, vos messages et votre historique seront supprimés.</Banner>
        <Field label="Tapez SUPPRIMER pour confirmer" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" placeholder="SUPPRIMER" />
      </Sheet>
    </Screen>
  );
}
