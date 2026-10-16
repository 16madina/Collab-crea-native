import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Banner, Card, fmtDate, Screen, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Profile } from "../../src/types";
import { Button, Press } from "../../src/ui";
import { isLive, uploadFile, type Picked } from "../../src/backend/upload";
import { Analysis } from "../../src/components/verification/Analysis";
import { DocCapture } from "../../src/components/verification/DocCapture";
import { FaceScan } from "../../src/components/verification/FaceScan";

// Pièces acceptées ; le passeport n'a qu'une face à photographier (la page avec la photo).
const DOC_TYPES = [
  { key: "cni", label: "Carte d'identité", hint: "Recto et verso", icon: "card-outline", back: true },
  { key: "passeport", label: "Passeport", hint: "Page avec la photo", icon: "book-outline", back: false },
  { key: "permis", label: "Permis de conduire", hint: "Recto et verso", icon: "car-outline", back: true },
  { key: "sejour", label: "Carte de séjour", hint: "Recto et verso", icon: "document-text-outline", back: true },
] as const;
type DocType = (typeof DOC_TYPES)[number];

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
        <View style={[styles.iconBox, { backgroundColor: me.email_verified ? colors.successSoft : colors.warningSoft }]}>
          <Ionicons name={me.email_verified ? "mail" : "mail-unread-outline"} size={20} color={me.email_verified ? colors.success : colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Email</Text>
          <Text style={type.small}>{me.email_verified ? "Adresse vérifiée" : "En attente de confirmation"}</Text>
        </View>
        {!me.email_verified ? <Button label="Renvoyer" small variant="ghost" icon={null} onPress={() =>
              void useDB
                .getState()
                .resendVerification()
                .then((r) => (r.ok ? toast("Email de confirmation renvoyé") : toast(r.error, "error")))
            }
          /> : <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
      </View>
    </Card>
  );
}

function Identity({ me }: { me: Profile }) {
  const submitIdentity = useDB((s) => s.submitIdentity);
  const [phase, setPhase] = useState<"intro" | "face" | "faceCheck" | "docType" | "docFront" | "docBack" | "sending">("intro");
  const [selfies, setSelfies] = useState<Picked[]>([]);
  const [doc, setDoc] = useState<DocType>(DOC_TYPES[0]);
  const [front, setFront] = useState<Picked | null>(null);
  const [back, setBack] = useState<Picked | null>(null);
  const uploaded = useRef<{ document_url?: string; selfie_url?: string }>({});
  // Aperçu web (pas de caméra) : le parcours se visite, mais rien n'est envoyé en ligne.
  const preview = Platform.OS === "web";

  if (me.identity_verified)
    return (
      <Screen title="Vérification d'identité">
        <Animated.View entering={ZoomIn.duration(320)} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="shield-checkmark" size={52} color={colors.success} />
          </View>
          <Text style={type.h1}>Identité vérifiée</Text>
          <Text style={[type.body, { textAlign: "center" }]}>Votre compte est certifié. Le badge « Vérifié » est visible sur votre profil.</Text>
        </Animated.View>
        <EmailCard me={me} />
        <Button label="Retour au profil" variant="outline" icon={null} onPress={() => router.back()} />
      </Screen>
    );

  if (me.identity_submitted_at)
    return (
      <Screen title="Vérification d'identité">
        <Animated.View entering={ZoomIn.duration(320)} style={{ alignItems: "center", gap: 12, marginTop: 20 }}>
          <View style={[styles.bigIcon, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="hourglass-outline" size={48} color={colors.warning} />
          </View>
          <Text style={type.h1}>Vérification en cours</Text>
          <Text style={[type.body, { textAlign: "center" }]}>
            Demande envoyée le {fmtDate(me.identity_submitted_at, true)}
            {me.identity_method === "face_scan" ? " (scan du visage et pièce d'identité)" : me.identity_method === "selfie" ? " (vérification faciale)" : " (document)"}. Notre équipe vous répond sous 24 h.
          </Text>
        </Animated.View>
        <EmailCard me={me} />
        <Banner tone="info">Vous recevrez une notification dès que votre identité sera validée.</Banner>
        <Button label="Retour au profil" variant="outline" icon={null} onPress={() => router.back()} />
      </Screen>
    );

  const restart = () => {
    setSelfies([]);
    setFront(null);
    setBack(null);
    setPhase("intro");
  };

  if (phase === "face")
    return (
      <View style={styles.full}>
        <FaceScan
          onCancel={() => setPhase("intro")}
          onDone={(photos) => {
            setSelfies(photos);
            setPhase("faceCheck");
          }}
        />
      </View>
    );

  if (phase === "faceCheck")
    return (
      <View style={styles.full}>
        <Analysis
          title="Vérification du visage…"
          doneTitle="Visage validé"
          steps={["Analyse des points du visage", "Détection de présence réelle", "Contrôle de la netteté des photos"]}
          task={async () => {
            if (!preview && selfies.length === 0) throw new Error("Les photos du visage n'ont pas été enregistrées. Recommencez le scan.");
          }}
          onError={(m) => {
            toast(m, "error");
            setPhase("intro");
          }}
          onDone={() => setPhase("docType")}
        />
      </View>
    );

  if (phase === "docFront" || phase === "docBack") {
    const isFront = phase === "docFront";
    return (
      <View style={styles.full}>
        <DocCapture
          key={phase}
          side={{
            title: doc.key === "passeport" ? "Page photo du passeport" : `${isFront ? "Recto" : "Verso"} : ${doc.label.toLowerCase()}`,
            sub: isFront ? "Placez le document dans le cadre, bien à plat." : "Retournez le document et placez-le dans le cadre.",
            ratio: doc.key === "passeport" ? 1.42 : 1.586,
            step: doc.back ? (isFront ? "1/2" : "2/2") : "1/1",
          }}
          onCancel={() => setPhase("docType")}
          onDone={(p) => {
            if (isFront) {
              setFront(p);
              setPhase(doc.back ? "docBack" : "sending");
            } else {
              setBack(p);
              setPhase("sending");
            }
          }}
        />
      </View>
    );
  }

  if (phase === "sending")
    return (
      <View style={styles.full}>
        <Analysis
          title="Vérification en cours…"
          doneTitle="Demande envoyée"
          steps={["Chiffrement des photos", "Envoi sécurisé des fichiers", "Contrôle de la qualité du document", "Transmission à l'équipe de vérification"]}
          task={async () => {
            if (preview || !isLive()) return;
            const sub = `identity/${Date.now()}`;
            let selfie_url: string | undefined;
            for (const p of selfies) {
              const path = await uploadFile("selfies", p, sub);
              selfie_url = selfie_url ?? path;
            }
            const document_url = front ? await uploadFile("identity-documents", { ...front, name: `recto-${doc.key}.jpg` }, sub) : undefined;
            if (back) await uploadFile("identity-documents", { ...back, name: `verso-${doc.key}.jpg` }, sub);
            uploaded.current = { document_url, selfie_url };
          }}
          onError={(m) => {
            toast(m, "error");
            setPhase("docType");
          }}
          onDone={() => {
            if (preview && isLive()) {
              toast("Aperçu terminé : la vraie vérification se fait depuis l'app sur téléphone.");
              return restart();
            }
            submitIdentity("face_scan", uploaded.current);
            toast("Demande envoyée ! Réponse sous 24 h.");
          }}
        />
      </View>
    );

  if (phase === "docType")
    return (
      <Screen title="Votre pièce d'identité" subtitle="Étape 2 sur 2">
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.okBox]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={[type.h3, { flex: 1 }]}>Scan du visage validé</Text>
        </Animated.View>
        <Text style={type.body}>Choisissez le document à photographier. Il doit être valide et à votre nom.</Text>
        {DOC_TYPES.map((d, i) => (
          <Animated.View key={d.key} entering={FadeInDown.delay(i * 60).duration(300)}>
            <Press
              scaleTo={0.98}
              style={styles.docRow}
              onPress={() => {
                setDoc(d);
                setFront(null);
                setBack(null);
                setPhase("docFront");
              }}
            >
              <View style={styles.docIcon}>
                <Ionicons name={d.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{d.label}</Text>
                <Text style={type.small}>{d.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Press>
          </Animated.View>
        ))}
        <Banner tone="info" icon="lock-closed-outline">
          {"Vos documents sont chiffrés et visibles uniquement par l'équipe de vérification Collab Créa."}
        </Banner>
      </Screen>
    );

  return (
    <Screen
      title="Vérification d'identité"
      subtitle="Environ 2 minutes"
      footer={<Button label="Commencer la vérification" icon="scan-outline" style={{ flex: 1 }} onPress={() => setPhase("face")} />}
    >
      <Animated.View entering={FadeInDown.duration(320)} style={{ alignItems: "center", gap: 10, marginTop: 4 }}>
        <View style={[styles.bigIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="scan-outline" size={50} color={colors.primary} />
        </View>
        <Text style={[type.h1, { textAlign: "center" }]}>Vérifiez votre identité</Text>
        <Text style={[type.body, { textAlign: "center" }]}>
          {me.role === "brand" ? "Obligatoire pour engager des créateurs." : "Obligatoire pour postuler aux offres."} Votre profil reçoit le badge « Vérifié ».
        </Text>
      </Animated.View>

      <Card style={{ gap: 16 }}>
        {[
          ["scan-outline", "Scan du visage", "Tournez la tête comme demandé : devant, gauche, droite, haut, bas."],
          ["card-outline", "Pièce d'identité", "Photo de votre carte d'identité, passeport, permis ou carte de séjour."],
          ["shield-checkmark-outline", "Validation", "Notre équipe compare votre visage et votre pièce, sous 24 h."],
        ].map(([ic, t, d], i) => (
          <Animated.View key={t} entering={FadeInDown.delay(100 + i * 80).duration(300)} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View style={styles.stepNum}>
              <Text style={{ color: colors.onPrimary, fontWeight: "800", fontSize: 13 }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={16} color={colors.primary} />
                <Text style={type.h3}>{t}</Text>
              </View>
              <Text style={type.small}>{d}</Text>
            </View>
          </Animated.View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={type.h3}>Pour réussir du premier coup</Text>
        {[
          ["sunny-outline", "Un endroit bien éclairé"],
          ["glasses-outline", "Sans lunettes de soleil, chapeau ni masque"],
          ["person-outline", "Seul(e) devant l'écran"],
        ].map(([ic, t]) => (
          <View key={t} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
            <Text style={[type.body, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
      </Card>

      <EmailCard me={me} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bigIcon: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", ...shadow.soft },
  full: { flex: 1, backgroundColor: "#000" },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 1 },
  okBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.successSoft },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  docIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});
