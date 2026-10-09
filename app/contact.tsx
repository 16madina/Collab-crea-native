import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { isEmail } from "../src/components/account/constants";
import { Card, Field, Screen, toast } from "../src/kit";
import { displayName, useDB } from "../src/store";
import { colors, radius, type } from "../src/theme";
import { Button, Press } from "../src/ui";

const FAQ = [
  ["Comment fonctionne Collab Créa ?", "Les marques publient des offres, les créateurs postulent ou reçoivent des propositions. Une fois l'accord trouvé, la marque paie en séquestre et le créateur est payé après validation du contenu."],
  ["Combien coûte l'inscription ?", "L'inscription est gratuite. Une commission de 10 % est appliquée côté marque et 5 % côté créateur sur chaque collaboration."],
  ["Comment suis-je payé ?", "Vos gains sont crédités sur votre portefeuille Collab Créa. Vous pouvez les retirer par Mobile Money (Orange, Wave, MTN), PayPal ou virement."],
  ["Pourquoi vérifier mon identité ?", "La vérification protège la communauté contre les faux profils. Elle est obligatoire pour postuler aux offres et envoyer des messages."],
  ["Que faire en cas de litige ?", "Signalez le problème depuis la conversation ou le profil concerné. Notre équipe examine chaque signalement sous 48 h."],
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(open ? "180deg" : "0deg") }] }));
  return (
    <Animated.View layout={LinearTransition.springify()} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Press onPress={onToggle} scaleTo={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 }}>
        <Text style={[type.h3, { flex: 1, fontSize: 13 }]}>{q}</Text>
        <Animated.View style={chevron}>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Animated.View>
      </Press>
      {open ? (
        <Animated.Text entering={FadeIn} style={[type.body, { paddingBottom: 14 }]}>
          {a}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

export default function Contact() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  const [name, setName] = useState(displayName(me));
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<number | null>(0);
  const [sending, setSending] = useState(false);

  const send = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Nom requis";
    if (!isEmail(email)) e.email = "Email invalide";
    if (subject.trim().length < 3) e.subject = "Sujet requis";
    if (message.trim().length < 10) e.message = "10 caractères minimum";
    setErr(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubject("");
      setMessage("");
      toast("Message envoyé ! Nous vous répondrons sous 48 h.");
    }, 800);
  };

  return (
    <Screen title="Contact" subtitle="Nous sommes là pour vous aider">
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={{ backgroundColor: colors.night, gap: 14 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Nos coordonnées</Text>
          {(
            [
              ["mail-outline", "contact@collabcrea.com", () => Linking.openURL("mailto:contact@collabcrea.com")],
              ["location-outline", "Abidjan, Côte d'Ivoire", undefined],
              ["time-outline", "Lun – Ven · 9h – 18h (GMT)", undefined],
            ] as const
          ).map(([ic, t, fn]) => (
            <Press key={t} onPress={fn} style={{ flexDirection: "row", alignItems: "center", gap: 12 }} disabled={!fn}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,90,54,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={ic} size={18} color={colors.primary} />
              </View>
              <Text style={{ color: "#fff", fontWeight: "600" }}>{t}</Text>
            </Press>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <Card>
          <Text style={type.h2}>Écrivez-nous</Text>
          <Field label="Nom" value={name} onChangeText={setName} error={err.name} />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={err.email} placeholder="vous@exemple.com" />
          <Field label="Sujet" value={subject} onChangeText={setSubject} error={err.subject} placeholder="Question sur un paiement…" />
          <Field label="Message" value={message} onChangeText={setMessage} multiline maxLength={2000} error={err.message} />
          <Button label={sending ? "Envoi…" : "Envoyer"} icon="send-outline" onPress={sending ? undefined : send} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify()}>
        <Card style={{ gap: 0 }}>
          <Text style={[type.h2, { marginBottom: 4 }]}>Questions fréquentes</Text>
          {FAQ.map(([q, a], i) => (
            <FaqItem key={q} q={q} a={a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </Card>
      </Animated.View>
      <View style={{ height: 8, borderRadius: radius.sm }} />
    </Screen>
  );
}
