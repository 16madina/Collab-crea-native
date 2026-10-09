import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { avatarOf, collabTone, nameOf } from "../../src/components/collab/common";
import { PaymentSheet } from "../../src/components/collab/PaymentSheet";
import { Sheet } from "../../src/components/collab/Sheet";
import { Badge, Chips, Empty, Field, Row, toast } from "../../src/kit";
import { budgetLabel, computeCommission, fcfa, MIN_AGREED, useDB, useMe } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { COLLAB_LABEL } from "../../src/types";
import { Avatar, Button, Glass, IconButton, Press } from "../../src/ui";

const REASONS = ["Spam ou arnaque", "Comportement inapproprié", "Faux profil / Usurpation d'identité", "Harcèlement", "Autre"];
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const conv = useDB((s) => s.conversations.find((c) => c.id === id));
  const allMessages = useDB((s) => s.messages);
  const profiles = useDB((s) => s.profiles);
  const offer = useDB((s) => s.offers.find((o) => o.id === conv?.offer_id));
  const collaborations = useDB((s) => s.collaborations);
  const blocked = useDB((s) => s.blocked);
  const { sendMessage, markConversationRead, acceptProposal, refuseProposal, blockUser, report } = useDB.getState();

  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const messages = useMemo(() => allMessages.filter((m) => m.conversation_id === id), [allMessages, id]);
  const unreadCount = useMemo(() => messages.filter((m) => m.sender_id !== me?.user_id && !m.read_at).length, [messages, me?.user_id]);
  useEffect(() => {
    if (id && unreadCount > 0) markConversationRead(id);
  }, [id, unreadCount, markConversationRead]);

  const collab = useMemo(() => collaborations.find((c) => c.conversation_id === id && (!offer || c.offer_id === offer.id)), [collaborations, id, offer]);

  if (!conv || !me) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 20 }}>
        <Empty icon="chatbubbles-outline" title="Conversation introuvable" action={<Button label="Retour" small icon={null} onPress={() => router.back()} />} />
      </View>
    );
  }

  const otherId = conv.participants.find((p) => p !== me.user_id)!;
  const other = profiles.find((p) => p.user_id === otherId);
  const isBlocked = blocked.some((b) => b.blocker_id === me.user_id && b.blocked_id === otherId);
  const iCreated = conv.created_by === me.user_id;
  const isBrand = me.role === "brand";
  const negotiable = offer ? offer.budget_min === 0 && offer.budget_max === 0 : false;
  const lo = offer ? Math.max(MIN_AGREED, offer.budget_min) : MIN_AGREED;
  const hi = offer && !negotiable ? offer.budget_max : Infinity;
  const amt = Number(amount.replace(/\s/g, "")) || 0;
  const breakdown = computeCommission(amt || lo);

  const send = () => {
    const r = sendMessage(conv.id, text);
    if (!r.ok) return toast(r.error, "error");
    setText("");
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const openAccept = () => {
    if (!offer) return;
    const def = negotiable ? lo : Math.round((offer.budget_min + offer.budget_max) / 2);
    setAmount(String(Math.max(lo, def)));
    // la négociation n'a de sens que pour une fourchette ou un budget négociable
    if (!negotiable && offer.budget_min === offer.budget_max) return doAccept(offer.budget_min);
    setAcceptOpen(true);
  };
  const doAccept = (value?: number) => {
    const v = value ?? amt;
    if (v < lo || v > hi) return toast(`Le montant doit être entre ${fcfa(lo)} et ${hi === Infinity ? "∞" : fcfa(hi)}`, "error");
    const r = acceptProposal(conv.id, v);
    if (!r.ok) return toast(r.error, "error");
    setAcceptOpen(false);
    toast("Proposition acceptée ✅");
    if (isBrand && r.id) setTimeout(() => setPayOpen(true), 350);
  };
  const doRefuse = () => {
    const r = refuseProposal(conv.id);
    if (!r.ok) return toast(r.error, "error");
    toast("Proposition refusée", "info");
  };

  const renderProposal = () => {
    if (!offer) return null;
    if (collab && collab.status !== "refused" && collab.status !== "pending_payment") {
      return (
        <Press onPress={() => router.push(`/collab/${collab.id}`)} style={[styles.compact, shadow.soft]} scaleTo={0.98}>
          <Ionicons name="briefcase" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3} numberOfLines={1}>
              {offer.title}
            </Text>
            <Text style={type.small}>{fcfa(isBrand ? collab.agreed_amount : collab.creator_amount)}</Text>
          </View>
          <Badge label={COLLAB_LABEL[collab.status]} tone={collabTone(collab.status)} />
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Press>
      );
    }
    const head = (
      <>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.pIcon}>
            <Ionicons name="megaphone" size={16} color="#fff" />
          </View>
          <Text style={[type.tiny, { color: "rgba(255,255,255,0.7)", letterSpacing: 1, flex: 1 }]}>{conv.created_by === offer.brand_id ? "PROPOSITION DE COLLABORATION" : "CANDIDATURE"}</Text>
        </View>
        <Press onPress={() => router.push(`/offer/${offer.id}`)}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{offer.title}</Text>
        </Press>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <View style={styles.dPill}>
            <Text style={styles.dPillText}>💰 {budgetLabel(offer)}</Text>
          </View>
          {offer.content_types.map((t) => (
            <View key={t} style={styles.dPill}>
              <Text style={styles.dPillText}>{t}</Text>
            </View>
          ))}
          <View style={styles.dPill}>
            <Text style={styles.dPillText}>{offer.delivery_mode === "network" ? "📱 Réseau" : "📦 Privée"}</Text>
          </View>
        </View>
      </>
    );
    if (collab?.status === "refused")
      return (
        <View style={[styles.proposal, shadow.soft]}>
          {head}
          <Badge label="❌ Refusée" tone="danger" />
        </View>
      );
    if (collab?.status === "pending_payment")
      return (
        <View style={[styles.proposal, shadow.soft]}>
          {head}
          <Badge label="✅ Acceptée - En attente de paiement" tone="warning" />
          <Text style={{ color: "rgba(255,255,255,0.8)" }}>Montant convenu : {fcfa(collab.agreed_amount)}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {isBrand ? <Button label="Payer maintenant" small icon="lock-closed" onPress={() => setPayOpen(true)} style={{ flex: 1 }} /> : null}
            <Button label="Détails" small variant="outline" icon={null} onPress={() => router.push(`/collab/${collab.id}`)} style={{ flex: isBrand ? 0.6 : 1 }} />
          </View>
        </View>
      );
    if (iCreated)
      return (
        <View style={[styles.proposal, shadow.soft]}>
          {head}
          <Badge label="⏳ En attente de réponse" tone="muted" />
        </View>
      );
    return (
      <View style={[styles.proposal, shadow.soft]}>
        {head}
        {offer.description ? (
          <Text style={{ color: "rgba(255,255,255,0.8)" }} numberOfLines={3}>
            {offer.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label="Refuser" small variant="outline" icon="close" onPress={doRefuse} style={{ flex: 1 }} />
          <Button label="Accepter" small icon="checkmark" onPress={openAccept} style={{ flex: 1 }} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 16, gap: 8, paddingTop: insets.top + 90 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.springify()}>
          {renderProposal()}
        </Animated.View>
        <View style={styles.subject}>
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 11 }} numberOfLines={1}>
            {conv.subject}
          </Text>
        </View>
        {messages.map((m) => {
          const mine = m.sender_id === me.user_id;
          return (
            <Animated.View key={m.id} entering={FadeInUp.springify()} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={{ color: mine ? "#fff" : colors.ink, fontSize: 13, lineHeight: 18 }}>{m.content}</Text>
              <Text style={{ fontSize: 9, marginTop: 4, alignSelf: "flex-end", color: mine ? "rgba(255,255,255,0.75)" : colors.muted }}>
                {time(m.created_at)}
                {mine && m.read_at ? " · Lu" : ""}
              </Text>
            </Animated.View>
          );
        })}
      </ScrollView>

      <Glass style={[styles.header, { paddingTop: insets.top + 8 }]} intensity={60}>
        <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/collabs"))} />
        <Press onPress={() => router.push(`/profile/${otherId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }} scaleTo={0.98}>
          <Avatar uri={avatarOf(other)} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3} numberOfLines={1}>
              {nameOf(other)}
            </Text>
            <Text style={type.tiny} numberOfLines={1}>
              {other?.role === "brand" ? "Marque" : "Créateur"} · voir le profil
            </Text>
          </View>
        </Press>
        <IconButton name="ellipsis-horizontal" onPress={() => setMenu(true)} />
      </Glass>

      {isBlocked ? (
        <Animated.View entering={FadeIn} style={[styles.blocked, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Ionicons name="ban" size={16} color="#C53030" />
          <Text style={[type.small, { flex: 1 }]}>Vous avez bloqué cet utilisateur.</Text>
        </Animated.View>
      ) : (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Écrire un message…" placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={send} returnKeyType="send" multiline />
          <Press onPress={send} style={[styles.send, !text.trim() && { opacity: 0.5 }]} scaleTo={0.85}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Press>
        </View>
      )}

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Options">
        <Press
          style={styles.menuRow}
          onPress={() => {
            setMenu(false);
            router.push(`/profile/${otherId}`);
          }}
        >
          <Ionicons name="person-outline" size={20} color={colors.ink} />
          <Text style={type.h3}>Voir le profil</Text>
        </Press>
        <Press
          style={styles.menuRow}
          onPress={() => {
            setMenu(false);
            setTimeout(() => setReportOpen(true), 300);
          }}
        >
          <Ionicons name="flag-outline" size={20} color={colors.ink} />
          <Text style={type.h3}>Signaler</Text>
        </Press>
        <Press
          style={styles.menuRow}
          onPress={() => {
            const r = blockUser(otherId);
            setMenu(false);
            r.ok ? toast(`${nameOf(other)} a été bloqué`) : toast(r.error, "error");
          }}
        >
          <Ionicons name="ban-outline" size={20} color="#C53030" />
          <Text style={[type.h3, { color: "#C53030" }]}>Bloquer</Text>
        </Press>
      </Sheet>

      <Sheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`Signaler ${nameOf(other)}`}
        footer={
          <Button
            label="Envoyer le signalement"
            variant="dark"
            icon="flag"
            onPress={() => {
              report({ report_type: "user", target_user_id: otherId, reason, description: details.trim() || undefined });
              setReportOpen(false);
              setDetails("");
              toast("Signalement envoyé. Merci !");
            }}
          />
        }
      >
        <Chips options={REASONS} value={reason} onChange={setReason} />
        <Field value={details} onChangeText={setDetails} multiline placeholder="Précisez (optionnel)" />
      </Sheet>

      {offer ? (
        <Sheet visible={acceptOpen} onClose={() => setAcceptOpen(false)} title="Accepter la collaboration" subtitle={offer.title} footer={<Button label="Confirmer" icon="checkmark" onPress={() => doAccept()} />}>
          <Field
            label="Montant convenu (FCFA)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            hint={negotiable ? `Budget négociable — minimum ${fcfa(lo)}` : `Entre ${fcfa(lo)} et ${fcfa(hi)}`}
            error={amt && (amt < lo || amt > hi) ? "Montant hors de la fourchette" : undefined}
          />
          <View style={styles.recap}>
            <Row label="Montant convenu" value={fcfa(breakdown.agreed_amount)} />
            <Row label="Frais marque (10 %)" value={fcfa(breakdown.brandFee)} />
            <Row label="Total payé par la marque" value={fcfa(breakdown.brand_total)} bold />
            <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 6 }} />
            <Row label="Commission créateur (5 %)" value={`- ${fcfa(breakdown.creatorFee)}`} />
            <Row label="Le créateur recevra" value={fcfa(breakdown.creator_amount)} bold />
          </View>
        </Sheet>
      ) : null}
      {collab ? <PaymentSheet visible={payOpen} onClose={() => setPayOpen(false)} collabId={collab.id} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderRadius: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "rgba(251,244,239,0.8)",
  },
  subject: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginVertical: 10, maxWidth: "90%" },
  proposal: { backgroundColor: colors.night, borderRadius: radius.lg, padding: 16, gap: 12 },
  pIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  dPill: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  dPillText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  compact: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12 },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, backgroundColor: colors.bg },
  input: { flex: 1, minWidth: 0, minHeight: 46, maxHeight: 120, borderRadius: 23, backgroundColor: colors.surface, paddingHorizontal: 18, paddingTop: 13, paddingBottom: 12, fontSize: 13, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  blocked: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "#FDE7E7" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: "#FAF5F1" },
  recap: { backgroundColor: "#FAF5F1", borderRadius: radius.md, padding: 14 },
});
