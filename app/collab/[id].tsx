import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { avatarOf, InfoBox, nameOf } from "../../src/components/collab/common";
import { PaymentSheet } from "../../src/components/collab/PaymentSheet";
import { Sheet } from "../../src/components/collab/Sheet";
import { Badge, Banner, Card, Empty, Field, fmtDate, Label, Row, Screen, timeLeft, toast } from "../../src/kit";
import { computeCommission, fcfa, useDB, useMe } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { CollabStatus, COLLAB_LABEL } from "../../src/types";
import { Avatar, Button, Press } from "../../src/ui";

const isVideo = (u: string) => u.startsWith("video://");

function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

function Timeline({ status, network }: { status: CollabStatus; network: boolean }) {
  const steps = ["Paiement", "Création", "Validation", ...(network ? ["Publication"] : []), "Terminé"];
  const idx: Record<string, number> = {
    pending_payment: 0,
    in_progress: 1,
    revision_requested: 1,
    content_submitted: 2,
    in_review: 2,
    pending_publication: 3,
    publication_submitted: 3,
    completed: steps.length - 1,
  };
  const cur = status === "completed" ? steps.length : (idx[status] ?? 0);
  return (
    <View style={styles.timeline}>
      {steps.map((s, i) => {
        const done = i < cur;
        const on = i === cur;
        return (
          <View key={s} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={[styles.tlLine, { opacity: i === 0 ? 0 : 1 }, (done || on) && { backgroundColor: colors.primary }]} />
              <Animated.View entering={ZoomIn.delay(i * 80).springify()} style={[styles.tlDot, done && { backgroundColor: colors.primary, borderColor: colors.primary }, on && { borderColor: colors.primary }]}>
                {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : <Text style={{ fontSize: 11, fontWeight: "800", color: on ? colors.primary : colors.muted }}>{i + 1}</Text>}
              </Animated.View>
              <View style={[styles.tlLine, { opacity: i === steps.length - 1 ? 0 : 1 }, done && { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[type.tiny, (done || on) && { color: colors.ink }]} numberOfLines={1}>
              {s}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function CollabDetail() {
  useTick();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const collab = useDB((s) => s.collaborations.find((c) => c.id === id));
  const offer = useDB((s) => s.offers.find((o) => o.id === collab?.offer_id));
  const profiles = useDB((s) => s.profiles);
  const reviews = useDB((s) => s.reviews);
  const { submitContent, markPreviewViewed, approveContent, requestRevision, submitPublication, approvePublication, rateCreator } = useDB.getState();

  const [payOpen, setPayOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [links, setLinks] = useState<string[]>([""]);
  const [video, setVideo] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [askRevision, setAskRevision] = useState(false);
  const [pubUrl, setPubUrl] = useState("");
  const [ai, setAi] = useState<{ state: "idle" | "busy" | "done"; valid?: boolean; confidence?: number }>({ state: "idle" });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const rated = useMemo(() => reviews.some((r) => r.collaboration_id === id), [reviews, id]);

  if (!collab || !me) {
    return (
      <Screen title="Collaboration">
        <Empty icon="briefcase-outline" title="Collaboration introuvable" />
      </Screen>
    );
  }

  const isBrand = me.user_id === collab.brand_id;
  const isCreator = me.user_id === collab.creator_id;
  const other = profiles.find((p) => p.user_id === (isBrand ? collab.creator_id : collab.brand_id));
  const network = offer?.delivery_mode === "network";
  const brandFilms = offer?.filming_by === "brand" && offer?.presence_mode === "on_site";
  const iSubmit = brandFilms ? isBrand : isCreator;
  const iValidate = brandFilms ? isCreator : isBrand;
  const c = computeCommission(collab.agreed_amount);
  const tl = timeLeft(collab.deadline);
  const s = collab.status;
  const submitLabel = network && !brandFilms ? "Soumettre l'aperçu" : "Soumettre le contenu";
  const brief = offer?.creative_brief ?? {};
  const hasBrief = !!(brief.phone || brief.address || brief.hashtags || brief.mentions);

  const doSubmit = () => {
    const urls = [...links.map((l) => l.trim()).filter(Boolean), ...(video ? [video] : [])];
    const bad = links.find((l) => l.trim() && !/^https?:\/\/\S+\.\S+/.test(l.trim()));
    if (bad) return toast("Un des liens est invalide", "error");
    const r = submitContent(collab.id, urls, desc.trim() || undefined);
    if (!r.ok) return toast(r.error, "error");
    setSubmitOpen(false);
    setLinks([""]);
    setVideo(null);
    setDesc("");
    toast(brandFilms ? "Contenu envoyé au créateur pour validation" : "Contenu soumis 📤");
  };
  const doApprove = () => {
    const r = approveContent(collab.id);
    if (!r.ok) return toast(r.error, "error");
    setReviewOpen(false);
    toast(network ? "Aperçu approuvé — le créateur peut publier" : "Contenu approuvé — paiement libéré 💰");
  };
  const doRevision = () => {
    const r = requestRevision(collab.id, feedback);
    if (!r.ok) return toast(r.error, "error");
    setReviewOpen(false);
    setAskRevision(false);
    setFeedback("");
    toast("Demande de modification envoyée", "info");
  };
  const doPublish = () => {
    const r = submitPublication(collab.id, pubUrl);
    if (!r.ok) return toast(r.error, "error");
    setPubUrl("");
    toast("Lien de publication soumis 🔗");
  };
  const verifyAi = () => {
    setAi({ state: "busy" });
    setTimeout(() => {
      const ok = /^https?:\/\/(www\.)?(instagram|tiktok|youtube|youtu\.be|facebook|snapchat|x|twitter)\./i.test(collab.publication_url ?? "") || Math.random() > 0.3;
      setAi({ state: "done", valid: ok, confidence: ok ? 82 + Math.round(Math.random() * 16) : 35 + Math.round(Math.random() * 25) });
    }, 1500);
  };
  const confirmPublication = () => {
    const r = approvePublication(collab.id);
    if (!r.ok) return toast(r.error, "error");
    toast("Publication confirmée — paiement libéré 💰");
  };
  const doRate = () => {
    if (!stars) return toast("Choisissez une note", "error");
    rateCreator(collab.id, stars, comment.trim());
    toast("Merci pour votre avis ⭐");
  };

  const ContentLinks = () => (
    <View style={{ gap: 8 }}>
      {collab.content_urls.map((u, i) => (
        <Press key={i} onPress={() => (isVideo(u) ? toast("Vidéo hébergée sur Collab Créa", "info") : Linking.openURL(u).catch(() => toast("Lien impossible à ouvrir", "error")))} style={styles.link}>
          <Ionicons name={isVideo(u) ? "videocam" : "link"} size={16} color={colors.primary} />
          <Text style={[type.small, { flex: 1, color: colors.ink }]} numberOfLines={1}>
            {isVideo(u) ? "Vidéo importée" : u}
          </Text>
        </Press>
      ))}
    </View>
  );

  const actionCard = () => {
    // --- paiement initial ---
    if (s === "pending_payment")
      return isBrand ? (
        <Card>
          <Text style={type.h3}>Paiement requis</Text>
          <Text style={type.small}>Versez le montant en séquestre pour lancer la collaboration. Il ne sera libéré qu'après validation.</Text>
          <Row label="Total à payer" value={fcfa(c.brand_total)} bold />
          <Button label="Payer maintenant" icon="lock-closed" onPress={() => setPayOpen(true)} />
        </Card>
      ) : (
        <Banner tone="warning">En attente du paiement de la marque. Vous serez notifié dès que le montant sera sécurisé.</Banner>
      );
    // --- création ---
    if (s === "in_progress" || s === "revision_requested") {
      return (
        <View style={{ gap: 12 }}>
          {s === "revision_requested" && collab.brand_feedback ? (
            <Card style={{ backgroundColor: "#FFF3D6" }}>
              <Text style={type.h3}>🔄 Modification demandée</Text>
              <Text style={type.body}>{collab.brand_feedback}</Text>
            </Card>
          ) : null}
          {iSubmit ? (
            <Card>
              <Text style={type.h3}>{s === "revision_requested" ? "Soumettre une nouvelle version" : submitLabel}</Text>
              <Text style={type.small}>
                {brandFilms ? "Envoyez le contenu filmé. Le créateur aura 48h pour le valider." : network ? "Envoyez un aperçu avant publication. Après validation, vous publierez sur vos réseaux." : "Livrez vos fichiers ou liens à la marque."}
              </Text>
              <Button label={s === "revision_requested" ? "Renvoyer le contenu" : submitLabel} icon="cloud-upload-outline" onPress={() => setSubmitOpen(true)} />
            </Card>
          ) : (
            <Banner tone="info">{brandFilms ? "La marque prépare le contenu filmé sur place." : "Le créateur travaille sur le contenu."}</Banner>
          )}
        </View>
      );
    }
    // --- validation ---
    if (s === "content_submitted" || s === "in_review") {
      if (!iValidate)
        return (
          <Card>
            <Text style={type.h3}>Contenu soumis ✅</Text>
            <Text style={type.small}>
              {brandFilms ? "Le créateur" : "La marque"} examine le contenu. Validation automatique le {fmtDate(collab.auto_approve_at, true)}.
            </Text>
            <ContentLinks />
          </Card>
        );
      const viewed = !!collab.preview_viewed_at;
      return (
        <Card>
          <Text style={type.h3}>{brandFilms ? "Contenu à valider (48h)" : network ? "Aperçu à valider" : "Contenu prêt à être validé"}</Text>
          {collab.content_description ? <Text style={type.body}>{collab.content_description}</Text> : null}
          {collab.auto_approve_at ? <Badge label={`Validation auto : ${fmtDate(collab.auto_approve_at, true)}`} tone="warning" /> : null}
          {!collab.paid ? (
            <>
              <Text style={type.small}>Le contenu est verrouillé tant que le paiement n'a pas été effectué.</Text>
              {isBrand ? <Button label="Payer pour débloquer le contenu" icon="lock-open-outline" onPress={() => setPayOpen(true)} /> : null}
            </>
          ) : (
            <>
              {isBrand && !brandFilms ? (
                <Button
                  label={viewed ? "Aperçu déjà visionné" : "Visionner une fois"}
                  variant={viewed ? "ghost" : "dark"}
                  icon="eye-outline"
                  onPress={() => (viewed ? toast("L'aperçu filigrané ne peut être vu qu'une fois", "info") : setPreviewOpen(true))}
                />
              ) : (
                <ContentLinks />
              )}
              <Button label="Examiner et valider" icon="checkmark-done" onPress={() => setReviewOpen(true)} />
            </>
          )}
        </Card>
      );
    }
    // --- publication ---
    if (s === "pending_publication")
      return isCreator ? (
        <Card>
          <Text style={type.h3}>📱 Publiez maintenant</Text>
          <Text style={type.small}>Votre aperçu a été approuvé. Publiez le contenu sur vos réseaux puis collez le lien de la publication.</Text>
          <Field value={pubUrl} onChangeText={setPubUrl} placeholder="https://www.instagram.com/p/…" autoCapitalize="none" keyboardType="url" />
          <Button label="Soumettre le lien" icon="link" onPress={doPublish} />
        </Card>
      ) : (
        <Banner tone="info">Aperçu approuvé. En attente de la publication du créateur.</Banner>
      );
    if (s === "publication_submitted")
      return isBrand ? (
        <Card>
          <Text style={type.h3}>🔗 Publication à vérifier</Text>
          <Press onPress={() => Linking.openURL(collab.publication_url!).catch(() => {})} style={styles.link}>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
            <Text style={[type.small, { flex: 1, color: colors.ink }]} numberOfLines={1}>
              {collab.publication_url}
            </Text>
          </Press>
          {ai.state === "idle" ? <Button label="Vérifier le lien par IA" variant="dark" icon="sparkles" onPress={verifyAi} /> : null}
          {ai.state === "busy" ? (
            <View style={styles.aiBusy}>
              <ActivityIndicator color={colors.primary} />
              <Text style={type.small}>Analyse de la publication en cours…</Text>
            </View>
          ) : null}
          {ai.state === "done" ? (
            <Animated.View entering={FadeIn} style={{ gap: 10 }}>
              <Banner tone={ai.valid ? "success" : "danger"}>
                {ai.valid ? `Publication valide — confiance ${ai.confidence} %` : `Publication non confirmée — confiance ${ai.confidence} %. Vérifiez manuellement le lien.`}
              </Banner>
              <Button label="Confirmer la publication et payer" icon="checkmark-circle" onPress={confirmPublication} />
              {!ai.valid ? <Button label="Relancer l'analyse" variant="outline" icon="refresh" onPress={verifyAi} /> : null}
            </Animated.View>
          ) : null}
        </Card>
      ) : (
        <Banner tone="info">Lien soumis. La marque vérifie votre publication avant de libérer le paiement.</Banner>
      );
    if (s === "completed")
      return (
        <View style={{ gap: 12 }}>
          <Card style={{ backgroundColor: "#E4F6EC" }}>
            <Text style={type.h3}>🎉 Collaboration terminée</Text>
            <Text style={type.small}>{isCreator ? `${fcfa(collab.creator_amount)} ont été crédités sur votre portefeuille.` : "Le paiement a été versé au créateur."}</Text>
            {isCreator ? <Button label="Voir mon portefeuille" small icon="wallet-outline" onPress={() => router.push("/wallet")} /> : null}
          </Card>
          {isBrand && !rated ? (
            <Card>
              <Text style={type.h3}>Notez {nameOf(other)}</Text>
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Press key={n} onPress={() => setStars(n)} scaleTo={0.8}>
                    <Ionicons name={n <= stars ? "star" : "star-outline"} size={34} color={n <= stars ? "#F5A623" : colors.muted} />
                  </Press>
                ))}
              </View>
              <Field value={comment} onChangeText={setComment} multiline placeholder="Votre commentaire (optionnel)" />
              <Button label="Envoyer mon avis" icon="send" onPress={doRate} />
            </Card>
          ) : isBrand ? (
            <Banner tone="success">Merci, votre avis a été enregistré.</Banner>
          ) : null}
        </View>
      );
    return <Banner tone="danger">{`Collaboration ${COLLAB_LABEL[s].toLowerCase()}.`}</Banner>;
  };

  return (
    <Screen title={offer?.title ?? "Collaboration"} subtitle={COLLAB_LABEL[s]}>
      <Animated.View entering={FadeInDown.springify()}>
        <View style={[styles.hero, shadow.soft]}>
          <LinearGradient colors={["#1E1E1E", "#121212"]} style={StyleSheet.absoluteFill} />
          <Press onPress={() => other && router.push(`/profile/${other.user_id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }} scaleTo={0.98}>
            <Avatar uri={avatarOf(other)} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{isBrand ? "Créateur" : "Marque"}</Text>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{nameOf(other)}</Text>
            </View>
            <Press onPress={() => router.push(`/chat/${collab.conversation_id}`)} style={styles.chatBtn}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
            </Press>
          </Press>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{isBrand ? "Montant convenu" : "Vous recevrez"}</Text>
            <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.6 }}>{fcfa(isBrand ? collab.agreed_amount : collab.creator_amount)}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {s === "in_progress" || s === "revision_requested" ? <Badge label={`⏱ ${tl.label}`} tone={tl.tone} /> : null}
            <Badge label={collab.paid ? "🔒 Séquestre versé" : "Non payé"} tone={collab.paid ? "success" : "warning"} />
            {network ? <Badge label="📱 Réseau" tone="dark" /> : <Badge label="📦 Privée" tone="muted" />}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <Timeline status={s} network={network} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: 12 }}>
        {actionCard()}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify()} style={{ gap: 12 }}>
        <Card>
          <Text style={type.h3}>Détails</Text>
          <Row label="Échéance" value={fmtDate(collab.deadline, true)} />
          <Row label="Démarrée le" value={fmtDate(collab.created_at, true)} />
          {offer ? <Row label="Contenus" value={offer.content_types.join(", ")} /> : null}
          {isBrand ? (
            <>
              <Row label="Frais de service (10 %)" value={fcfa(c.brandFee)} />
              <Row label="Total payé" value={fcfa(c.brand_total)} bold />
            </>
          ) : (
            <>
              <Row label="Montant convenu" value={fcfa(collab.agreed_amount)} />
              <Row label="Commission (5 %)" value={`- ${fcfa(c.creatorFee)}`} />
            </>
          )}
          {offer ? <Button label="Voir l'offre" variant="ghost" small icon="document-text-outline" onPress={() => router.push(`/offer/${offer.id}`)} /> : null}
        </Card>
        {offer && (isCreator || isBrand) && (hasBrief || offer.expectations) ? (
          <Card>
            <Text style={type.h3}>🎨 Brief créatif</Text>
            {offer.expectations ? <Row label="Attentes" value={offer.expectations} /> : null}
            {brief.hashtags ? <Row label="Hashtags" value={brief.hashtags} /> : null}
            {brief.mentions ? <Row label="Mentions" value={brief.mentions} /> : null}
            {brief.phone ? <Row label="Téléphone" value={brief.phone} /> : null}
            {brief.address ? <Row label="Adresse" value={brief.address} /> : null}
            {offer.presence_mode === "on_site" ? <Row label="Lieu" value={[offer.on_site_store_name, offer.on_site_neighborhood, offer.on_site_city].filter(Boolean).join(", ")} /> : null}
          </Card>
        ) : null}
      </Animated.View>

      <PaymentSheet visible={payOpen} onClose={() => setPayOpen(false)} collabId={collab.id} title={s === "content_submitted" ? "Débloquer le contenu" : undefined} />

      <Sheet visible={submitOpen} onClose={() => setSubmitOpen(false)} title={submitLabel} subtitle="1 à 4 liens, ou une vidéo" footer={<Button label="Envoyer" icon="send" onPress={doSubmit} />}>
        <Label>Liens du contenu</Label>
        {links.map((l, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Field value={l} onChangeText={(v) => setLinks((x) => x.map((y, j) => (j === i ? v : y)))} placeholder="https://drive.google.com/…" autoCapitalize="none" keyboardType="url" />
            </View>
            {links.length > 1 ? (
              <Press onPress={() => setLinks((x) => x.filter((_, j) => j !== i))} style={styles.del}>
                <Ionicons name="close" size={18} color="#C53030" />
              </Press>
            ) : null}
          </View>
        ))}
        {links.length < 4 ? <Button label="Ajouter un lien" variant="ghost" small icon="add" onPress={() => setLinks((x) => [...x, ""])} /> : null}
        <Label>Vidéo (optionnel)</Label>
        <Press onPress={() => setVideo(video ? null : `video://upload-${Date.now()}.mp4`)} style={[styles.videoBox, video && { borderColor: colors.success, backgroundColor: "#E4F6EC" }]}>
          <Ionicons name={video ? "checkmark-circle" : "videocam-outline"} size={26} color={video ? colors.success : colors.primary} />
          <Text style={type.small}>{video ? "Vidéo ajoutée — touchez pour retirer" : "Importer une vidéo (aperçu)"}</Text>
        </Press>
        <Field label="Description" value={desc} onChangeText={setDesc} multiline placeholder="Précisions sur votre livraison…" />
      </Sheet>

      <Sheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={network && !brandFilms ? "Valider l'aperçu" : "Valider le contenu"}
        footer={
          askRevision ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Annuler" variant="outline" icon={null} onPress={() => setAskRevision(false)} style={{ flex: 1 }} />
              <Button label="Envoyer" icon="send" onPress={doRevision} style={{ flex: 1 }} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Demander une modification" variant="outline" icon={null} small onPress={() => setAskRevision(true)} style={{ flex: 1 }} />
              <Button label="Approuver" icon="checkmark" small onPress={doApprove} style={{ flex: 0.8 }} />
            </View>
          )
        }
      >
        {collab.auto_approve_at ? <InfoBox icon="time-outline">{`Sans réponse, le contenu sera approuvé automatiquement le ${fmtDate(collab.auto_approve_at, true)}.`}</InfoBox> : null}
        <ContentLinks />
        <View style={styles.recap}>
          <Row label="Montant séquestré" value={fcfa(c.brand_total)} />
          <Row label="Commission plateforme" value={fcfa(c.platform_fee)} />
          <Row label="Le créateur recevra" value={fcfa(collab.creator_amount)} bold />
        </View>
        {askRevision ? (
          <Animated.View entering={FadeIn}>
            <Field label="Modifications souhaitées *" value={feedback} onChangeText={setFeedback} multiline placeholder="Décrivez précisément ce qui doit être modifié…" />
          </Animated.View>
        ) : null}
      </Sheet>

      <Modal visible={previewOpen} animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={[styles.preview, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>Aperçu protégé</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>Cet aperçu filigrané ne peut être visionné qu'une seule fois.</Text>
          <View style={styles.previewFrame}>
            <View style={{ gap: 10, padding: 18 }}>
              {collab.content_urls.map((u, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Ionicons name={isVideo(u) ? "play-circle" : "image"} size={22} color="#fff" />
                  <Text style={{ color: "#fff" }} numberOfLines={1}>
                    {isVideo(u) ? "Vidéo — lecture" : u.replace(/^https?:\/\//, "")}
                  </Text>
                </View>
              ))}
            </View>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Text key={i} style={[styles.watermark, { top: 20 + i * 60 }]}>
                  COLLAB CRÉA • APERÇU • {me.user_id.slice(-4).toUpperCase()}
                </Text>
              ))}
            </View>
          </View>
          <Pressable
            onPress={() => {
              markPreviewViewed(collab.id);
              setPreviewOpen(false);
              setTimeout(() => setReviewOpen(true), 300);
            }}
            style={styles.previewClose}
          >
            <Text style={{ color: colors.ink, fontWeight: "800" }}>J'ai visionné — passer à la validation</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 18, gap: 14, overflow: "hidden" },
  chatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  timeline: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14 },
  tlLine: { flex: 1, height: 2, backgroundColor: colors.line },
  tlDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  link: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: "#FAF5F1" },
  aiBusy: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  del: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FDE7E7", alignItems: "center", justifyContent: "center" },
  videoBox: { alignItems: "center", gap: 6, padding: 18, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary, backgroundColor: colors.primarySoft },
  recap: { backgroundColor: "#FAF5F1", borderRadius: radius.md, padding: 14 },
  preview: { flex: 1, backgroundColor: "#000", alignItems: "center", paddingHorizontal: 20, gap: 14 },
  previewFrame: { flex: 1, width: "100%", borderRadius: radius.lg, backgroundColor: "#1A1A1A", overflow: "hidden", justifyContent: "center" },
  watermark: { position: "absolute", left: -40, right: -40, textAlign: "center", color: "rgba(255,255,255,0.18)", fontWeight: "900", fontSize: 18, transform: [{ rotate: "-20deg" }] },
  previewClose: { backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: 22, height: 52, alignItems: "center", justifyContent: "center" },
});
