import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { avatarOf, collabTone, nameOf, SearchBar } from "../../src/components/collab/common";
import { Badge, Chip, Empty, fmtDate, Segmented, timeLeft } from "../../src/kit";
import { fcfa, useDB, useMe } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { ACTIVE_COLLAB, COLLAB_LABEL } from "../../src/types";
import { Avatar, Press } from "../../src/ui";

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 6e4);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h`;
  return fmtDate(iso);
};

function Messages() {
  const userId = useDB((s) => s.userId);
  const conversations = useDB((s) => s.conversations);
  const messages = useDB((s) => s.messages);
  const profiles = useDB((s) => s.profiles);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return conversations
      .filter((c) => userId && c.participants.includes(userId))
      .map((c) => {
        const other = profiles.find((p) => p.user_id === c.participants.find((x) => x !== userId));
        const msgs = messages.filter((m) => m.conversation_id === c.id);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((m) => m.sender_id !== userId && !m.read_at).length;
        return { c, other, last, unread };
      })
      .filter((r) => !t || `${nameOf(r.other)} ${r.c.subject}`.toLowerCase().includes(t))
      .sort((a, b) => (b.last?.created_at ?? b.c.updated_at).localeCompare(a.last?.created_at ?? a.c.updated_at));
  }, [conversations, messages, profiles, userId, q]);

  return (
    <View style={{ gap: 12 }}>
      <SearchBar value={q} onChange={setQ} placeholder="Rechercher une conversation" />
      {rows.length === 0 ? (
        <Empty icon="chatbubbles-outline" title="Aucune conversation" text="Vos échanges avec les marques et créateurs apparaîtront ici." />
      ) : (
        rows.map(({ c, other, last, unread }, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(Math.min(i, 8) * 50).springify()} layout={LinearTransition.springify()}>
            <Press onPress={() => router.push(`/chat/${c.id}`)} style={[styles.conv, shadow.soft]} scaleTo={0.98}>
              <Avatar uri={avatarOf(other)} size={52} ring={unread > 0} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>
                    {nameOf(other)}
                  </Text>
                  <Text style={type.tiny}>{ago(last?.created_at ?? c.updated_at)}</Text>
                </View>
                <Text style={[type.tiny, { color: colors.primary }]} numberOfLines={1}>
                  {c.subject}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[type.small, { flex: 1 }, unread > 0 && { color: colors.ink, fontWeight: "700" }]} numberOfLines={1}>
                    {last ? `${last.sender_id === userId ? "Vous : " : ""}${last.content.replace(/\n+/g, " ")}` : "Nouvelle conversation"}
                  </Text>
                  {unread > 0 ? (
                    <View style={styles.unread}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Press>
          </Animated.View>
        ))
      )}
    </View>
  );
}

function Collaborations() {
  const me = useMe();
  const collaborations = useDB((s) => s.collaborations);
  const offers = useDB((s) => s.offers);
  const profiles = useDB((s) => s.profiles);
  const [sub, setSub] = useState<"active" | "done">("active");

  const mine = useMemo(() => collaborations.filter((c) => me && (c.brand_id === me.user_id || c.creator_id === me.user_id) && c.status !== "refused"), [collaborations, me]);
  const active = useMemo(() => mine.filter((c) => ACTIVE_COLLAB.includes(c.status)), [mine]);
  const done = useMemo(() => mine.filter((c) => !ACTIVE_COLLAB.includes(c.status)), [mine]);
  const list = sub === "active" ? active : done;
  const isBrand = me?.role === "brand";

  return (
    <View style={{ gap: 12 }}>
      {!isBrand ? (
        <Press onPress={() => router.push("/wallet")} style={[styles.wallet, shadow.soft]} scaleTo={0.98}>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Mon portefeuille</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Solde, retraits et historique</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Press>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={`En cours (${active.length})`} on={sub === "active"} onPress={() => setSub("active")} />
        <Chip label={`Terminées (${done.length})`} on={sub === "done"} onPress={() => setSub("done")} />
      </View>
      {list.length === 0 ? (
        <Empty icon="briefcase-outline" title={sub === "active" ? "Aucune collaboration en cours" : "Aucune collaboration terminée"} text="Les collaborations acceptées apparaîtront ici." />
      ) : (
        list.map((c, i) => {
          const offer = offers.find((o) => o.id === c.offer_id);
          const other = profiles.find((p) => p.user_id === (isBrand ? c.creator_id : c.brand_id));
          const tl = c.status === "in_progress" ? timeLeft(c.deadline) : null;
          return (
            <Animated.View key={c.id} entering={FadeInDown.delay(Math.min(i, 8) * 50).springify()} layout={LinearTransition.springify()}>
              <Press onPress={() => router.push(`/collab/${c.id}`)} style={[styles.collab, shadow.soft]} scaleTo={0.98}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar uri={avatarOf(other)} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3} numberOfLines={1}>
                      {offer?.title ?? "Collaboration"}
                    </Text>
                    <Text style={type.small} numberOfLines={1}>
                      {isBrand ? "avec " : "pour "}
                      {nameOf(other)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
                <View style={styles.collabFoot}>
                  <Badge label={COLLAB_LABEL[c.status]} tone={collabTone(c.status)} />
                  {tl ? <Badge label={`⏱ ${tl.label}`} tone={tl.tone} /> : null}
                  {c.payout_status === "completed" ? <Badge label="💰 Versé" tone="success" /> : c.paid && c.status !== "completed" ? <Badge label="🔒 Séquestre" tone="muted" /> : null}
                  <Text style={{ marginLeft: "auto", fontWeight: "800", color: colors.ink }}>{fcfa(isBrand ? c.agreed_amount : c.creator_amount)}</Text>
                </View>
              </Press>
            </Animated.View>
          );
        })
      )}
    </View>
  );
}

export default function Collabs() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"messages" | "collabs">(params.tab === "collabs" || params.tab === "collaborations" ? "collabs" : "messages");
  useEffect(() => {
    if (params.tab === "collabs" || params.tab === "collaborations") setTab("collabs");
    else if (params.tab === "messages") setTab("messages");
  }, [params.tab]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140, paddingHorizontal: 20, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.springify()}>
        <Text style={type.h1}>Collabs</Text>
        <Text style={type.small}>Vos échanges et collaborations</Text>
      </Animated.View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "messages", label: "Messages" },
          { value: "collabs", label: "Collaborations" },
        ]}
      />
      <Animated.View key={tab} entering={FadeIn.duration(220)}>
        {tab === "messages" ? <Messages /> : <Collaborations />}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conv: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 12, borderRadius: radius.lg },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  wallet: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.night, borderRadius: radius.lg, padding: 16 },
  walletIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,90,54,0.18)", alignItems: "center", justifyContent: "center" },
  collab: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 12 },
  collabFoot: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
});
