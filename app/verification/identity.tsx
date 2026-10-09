import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Banner, Card, Chips, fmtDate, Label, Screen, Segmented, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Profile } from "../../src/types";
import { Button, Press } from "../../src/ui";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DOCS = ["Carte d'identité", "Passeport", "Permis de conduire", "Carte de séjour"];
const FACE_STEPS = [
  { t: "Regardez droit devant vous", icon: "scan-outline" },
  { t: "Tournez lentement la tête à gauche", icon: "arrow-back-outline" },
  { t: "Tournez lentement la tête à droite", icon: "arrow-forward-outline" },
  { t: "Souriez naturellement", icon: "happy-outline" },
] as const;
const R = 110;
const C = 2 * Math.PI * R;

export default function IdentityScreen() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  if (!me) return <Redirect href="/" />;
  return <Identity me={me} />;
}

function EmailCard({ me }: { me: Profile }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.iconBox, { backgroundColor: me.email_verified ? "#DDF5E8" : "#FFF3D6" }]}>
          <Ionicons name={me.email_verified ? "mail" : "mail-unread-outline"} size={20} color={me.email_verified ? colors.success : "#B7791F"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Email</Text>
          <Text style={type.small}>{me.email_verified ? "Adresse vérifiée" : "En attente de confirmation"}</Text>
        </View>
        {!me.email_verified ? <Button label="Renvoyer" small variant="ghost" icon={null} onPress={() => toast("Email de vérification renvoyé")} /> : <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
      </View>
    </Card>
  );
}

function Identity({ me }: { me: Profile }) {
  const submitIdentity = useDB((s) => s.submitIdentity);
  const [method, setMethod] = useState<"document" | "selfie">("document");
  const [docType, setDocType] = useState(DOCS[0]);
  const [file, setFile] = useState<{ name: string; size: string } | null>(null);
  const [face, setFace] = useState<"idle" | "running" | "done">("idle");
  const [sending, setSending] = useState(false);

  if (me.identity_verified)
    return (
      <Screen title="Vérification d'identité">
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: "#DDF5E8" }]}>
            <Ionicons name="shield-checkmark" size={52} color={colors.success} />
          </View>
          <Text style={type.h1}>Identité vérifiée</Text>
          <Text style={[type.body, { textAlign: "center" }]}>Votre compte est certifié. Le badge « Vérifié » est visible par les marques.</Text>
        </Animated.View>
        <EmailCard me={me} />
        <Button label="Retour au profil" variant="outline" icon={null} onPress={() => router.back()} />
      </Screen>
    );

  if (me.identity_submitted_at)
    return (
      <Screen title="Vérification d'identité">
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: "#FFF3D6" }]}>
            <Ionicons name="hourglass-outline" size={48} color="#B7791F" />
          </View>
          <Text style={type.h1}>Vérification en cours</Text>
          <Text style={[type.body, { textAlign: "center" }]}>
            Demande envoyée le {fmtDate(me.identity_submitted_at, true)} par {me.identity_method === "selfie" ? "vérification faciale" : "document"}. Notre équipe vous répond sous 24 à 48 h.
          </Text>
        </Animated.View>
        <EmailCard me={me} />
        <Banner tone="info">Vous recevrez une notification dès que votre identité sera validée.</Banner>
      </Screen>
    );

  const submit = () => {
    if (method === "document" && !file) return toast("Ajoutez une photo de votre document", "error");
    if (method === "selfie" && face !== "done") return toast("Terminez la vérification faciale", "error");
    setSending(true);
    setTimeout(() => {
      submitIdentity(method);
      setSending(false);
      toast("Demande envoyée ! Vérification sous 24–48 h.");
    }, 900);
  };

  return (
    <Screen title="Vérification d'identité" subtitle="Sécurisez votre compte" footer={<Button label={sending ? "Envoi…" : "Envoyer ma demande"} icon="send-outline" style={{ flex: 1 }} onPress={sending ? undefined : submit} />}>
      <EmailCard me={me} />
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={{ backgroundColor: colors.night }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Pourquoi vérifier ?</Text>
          {[
            ["checkmark-circle", "Postuler aux offres et échanger avec les marques"],
            ["shield-checkmark", "Obtenir le badge « Vérifié » sur votre profil"],
            ["lock-closed", "Protéger la communauté contre les faux profils"],
            ["cash", "Recevoir vos paiements en toute sécurité"],
          ].map(([ic, t]) => (
            <View key={t} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
              <Text style={{ color: "rgba(255,255,255,0.85)", flex: 1 }}>{t}</Text>
            </View>
          ))}
        </Card>
      </Animated.View>

      <Label>Méthode de vérification</Label>
      <Segmented
        value={method}
        onChange={setMethod}
        options={[
          { value: "document", label: "Document" },
          { value: "selfie", label: "Vérification faciale" },
        ]}
      />

      {method === "document" ? (
        <Animated.View key="doc" entering={FadeIn} style={{ gap: 14 }}>
          <Label>Type de document</Label>
          <Chips options={DOCS} value={docType} onChange={setDocType} />
          <Press
            onPress={() => {
              setFile({ name: `${docType.toLowerCase().replace(/[^a-z]/g, "_")}_recto.jpg`, size: `${(1.2 + Math.random() * 3).toFixed(1)} Mo` });
              toast("Document ajouté");
            }}
            scaleTo={0.98}
            style={[styles.drop, file && { borderColor: colors.success, backgroundColor: "#F0FBF5" }]}
          >
            <Ionicons name={file ? "document-attach" : "cloud-upload-outline"} size={34} color={file ? colors.success : colors.primary} />
            <Text style={type.h3}>{file ? file.name : "Ajouter une photo du document"}</Text>
            <Text style={type.small}>{file ? `${file.size} · Touchez pour remplacer` : "JPG, PNG, WEBP ou PDF · 10 Mo max"}</Text>
          </Press>
          <Banner tone="info" icon="bulb-outline">
            Photo nette, sans reflet, les 4 coins visibles. Vos données sont chiffrées et jamais partagées.
          </Banner>
        </Animated.View>
      ) : (
        <Animated.View key="face" entering={FadeIn} style={{ gap: 14 }}>
          <FaceScan state={face} onStart={() => setFace("running")} onDone={() => setFace("done")} onRestart={() => setFace("running")} />
        </Animated.View>
      )}
    </Screen>
  );
}

function FaceScan({ state, onStart, onDone, onRestart }: { state: "idle" | "running" | "done"; onStart: () => void; onDone: () => void; onRestart: () => void }) {
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(3);
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);

  useEffect(() => {
    if (state !== "running") return;
    let s = 0;
    let c = 3;
    setStep(0);
    setCount(3);
    progress.value = 0;
    progress.value = withTiming(1 / 4, { duration: 3000, easing: Easing.linear });
    timer.current = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        s += 1;
        if (s >= 4) {
          clearInterval(timer.current!);
          onDone();
          return;
        }
        c = 3;
        setStep(s);
        progress.value = withTiming((s + 1) / 4, { duration: 3000, easing: Easing.linear });
      }
      setCount(c);
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const ring = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - progress.value) }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const cur = FACE_STEPS[Math.min(step, 3)];

  return (
    <Card style={{ alignItems: "center", paddingVertical: 24 }}>
      <View style={{ width: 2 * R + 20, height: 2 * R + 20, alignItems: "center", justifyContent: "center" }}>
        <Svg width={2 * R + 20} height={2 * R + 20} style={StyleSheet.absoluteFill}>
          <Circle cx={R + 10} cy={R + 10} r={R} stroke={colors.line} strokeWidth={8} fill="none" />
          <AnimatedCircle
            cx={R + 10}
            cy={R + 10}
            r={R}
            stroke={state === "done" ? colors.success : colors.primary}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            animatedProps={ring}
            transform={`rotate(-90 ${R + 10} ${R + 10})`}
          />
        </Svg>
        <Animated.View style={[styles.face, pulseStyle, state === "done" && { backgroundColor: "#DDF5E8" }]}>
          {state === "done" ? (
            <Animated.View entering={ZoomIn.springify()}>
              <Ionicons name="checkmark" size={80} color={colors.success} />
            </Animated.View>
          ) : state === "running" ? (
            <Animated.View key={step} entering={ZoomIn.springify()} style={{ alignItems: "center" }}>
              <Ionicons name={cur.icon} size={54} color={colors.primary} />
              <Text style={{ fontSize: 34, fontWeight: "800", color: colors.ink }}>{count}</Text>
            </Animated.View>
          ) : (
            <Ionicons name="person-outline" size={80} color={colors.muted} />
          )}
        </Animated.View>
      </View>
      {state === "running" ? (
        <Animated.View key={`t${step}`} entering={FadeInDown.springify()} style={{ alignItems: "center", gap: 4, marginTop: 14 }}>
          <Text style={type.tiny}>Étape {step + 1} sur 4</Text>
          <Text style={[type.h2, { textAlign: "center" }]}>{cur.t}</Text>
        </Animated.View>
      ) : state === "done" ? (
        <View style={{ alignItems: "center", gap: 10, marginTop: 14 }}>
          <Text style={type.h2}>Capture terminée</Text>
          <Text style={[type.small, { textAlign: "center" }]}>Vous pouvez maintenant envoyer votre demande.</Text>
          <Button label="Recommencer" small variant="outline" icon="refresh" onPress={onRestart} />
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: 10, marginTop: 14 }}>
          <Text style={[type.small, { textAlign: "center" }]}>4 étapes guidées de 3 secondes. Placez-vous dans un endroit bien éclairé.</Text>
          <Button label="Démarrer" small icon="camera-outline" onPress={onStart} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bigIcon: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", ...shadow.soft },
  drop: { alignItems: "center", gap: 6, padding: 24, borderRadius: radius.lg, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary, backgroundColor: colors.surface },
  face: { width: 2 * R - 24, height: 2 * R - 24, borderRadius: R, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});
