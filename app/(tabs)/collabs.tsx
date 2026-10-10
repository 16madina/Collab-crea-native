import { GuestGate } from "../../src/components/GuestGate";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { avatarOf, collabTone, nameOf, SearchBar } from "../../src/components/collab/common";
import { Badge, Chip, Empty, fmtDate, Segmented, timeLeft, toast } from "../../src/kit";
import { GlossFill, GoldFill, goldBorder, goldGlow } from "../../src/lux";
import { fcfa, useDB, useMe } from "../../src/store";
import { colors, fonts, radius, shadow, type } from "../../src/theme";
import { ACTIVE_COLLAB, COLLAB_LABEL } from "../../src/types";
import { Avatar, Logo, Press } from "../../src/ui";

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 6e4);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h`;
  return fmtDate(iso);
};

type Filter = "all" | "unread" | "brand" | "creator" | "archived";

function Messages() {
  const userId = useDB((s) => s.userId);
  const conversations = useDB((s) => s.conversations);
  const messages = useDB((s) => s.messages);
  const profiles = useDB((s) => s.profiles);
  const archived = useDB((s) => s.archived);
  const toggleArchive = useDB((s) => s.toggleArchive);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(
    () =>
      conversations
        .filter((c) => userId && c.participants.includes(userId))
        .map((c) => {
          const other = profiles.find((p) => p.user_id === c.participants.find((x) => x !== userId));
          const msgs = messages.filter((m) => m.conversation_id === c.id);
          const last = msgs[msgs.length - 1];
          const unread = msgs.filter((m) => m.sender_id !== userId && !m.read_at).length;
          return { c, other, last, unread, isArchived: archived.includes(c.id) };
        })
        .sort((a, b) => (b.last?.created_at ?? b.c.updated_at).localeCompare(a.last?.created_at ?? a.c.updated_at)),
    [conversations, messages, profiles, userId, archived],
  );
  const unreadCount = all.filter((r) => !r.isArchived && r.unread > 0).length;
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((r) => (filter === "archived" ? r.isArchived : !r.isArchived))
      .filter((r) => filter !== "unread" || r.unread > 0)
      .filter((r) => filter !== "brand" || r.other?.role === "brand")
      .filter((r) => filter !== "creator" || r.other?.role === "creator")
      .filter((r) => !t || `${nameOf(r.other)} ${r.c.subject} ${r.last?.content ?? ""}`.toLowerCase().includes(t));
  }, [all, q, filter]);

  const FILTERS: [Filter, string][] = [
    ["all", "Tous"],
    ["unread", "Non lus"],
    ["brand", "Marques"],
    ["creator", "Créateurs"],
    ["archived", "Archives"],
  ];

  return (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <GlossFill />
          <Ionicons name="search-outline" size={21} color={colors.inkSoft} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une conversation…" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <Press onPress={() => setFilter(filter === "all" ? "unread" : "all")} style={styles.roundBtn} scaleTo={0.9}>
          <GlossFill style={{ borderRadius: 23 }} />
          <Ionicons name="options-outline" size={22} color={colors.ink} />
        </Press>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14, paddingHorizontal: 16 }}>
        {FILTERS.map(([k, l]) => {
          const on = filter === k;
          return (
            <Press key={k} onPress={() => setFilter(k)} style={[styles.chip, on && [{ borderColor: "transparent" }, goldGlow]]} scaleTo={0.94}>
              {on && <GoldFill style={{ borderRadius: radius.pill }} />}
              <Text style={[styles.chipText, on && { color: colors.onPrimary, fontWeight: "800" }]}>{l}</Text>
              {k === "unread" && unreadCount > 0 ? (
                <View style={styles.chipBadge}>
                  <GoldFill style={{ borderRadius: 11 }} />
                  <Text style={styles.chipBadgeText}>{unreadCount}</Text>
                </View>
              ) : null}
            </Press>
          );
        })}
      </ScrollView>

      {rows.length === 0 ? (
        <Empty
          icon={filter === "archived" ? "archive-outline" : "chatbubbles-outline"}
          title={filter === "archived" ? "Aucune conversation archivée" : "Aucune conversation"}
          text={filter === "archived" ? "Appui long sur une conversation pour l'archiver." : "Tes échanges avec les marques et les créateurs apparaîtront ici."}
        />
      ) : (
        rows.map(({ c, other, last, unread }, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(Math.min(i, 8) * 50).springify()} layout={LinearTransition.springify()}>
            <Press
              onPress={() => router.push(`/chat/${c.id}`)}
              onLongPress={() => toast(toggleArchive(c.id) ? "Conversation archivée" : "Conversation désarchivée", "info")}
              style={styles.row}
              scaleTo={0.98}
            >
              <View style={styles.avatarRing}>
                <GoldFill style={{ borderRadius: 37 }} />
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarMono}>{nameOf(other).slice(0, 2).toUpperCase()}</Text>
                  <Image source={avatarOf(other)} style={StyleSheet.absoluteFill} contentFit="cover" />
                </View>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {nameOf(other)}
                  </Text>
                  {other?.identity_verified && <Ionicons name="checkmark-circle" size={17} color={colors.primary} />}
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{other?.role === "brand" ? "Marque" : "Créateur"}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.time}>{ago(last?.created_at ?? c.updated_at)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.preview, unread > 0 && { color: colors.ink }]} numberOfLines={2}>
                    {last ? `${last.sender_id === userId ? "Toi : " : ""}${last.content.replace(/\n+/g, " ")}` : c.subject}
                  </Text>
                  {unread > 0 ? (
                    <View style={styles.unread}>
                      <GoldFill style={{ borderRadius: 14 }} />
                      <Text style={styles.unreadText}>{unread}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
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
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Mon portefeuille</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Solde, retraits et historique</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Press>
      ) : null}
      <View style={{ flexDirection: "row", gap: 6 }}>
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

function CollabsInner() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"messages" | "collabs">(params.tab === "collabs" || params.tab === "collaborations" ? "collabs" : "messages");
  useEffect(() => {
    if (params.tab === "collabs" || params.tab === "collaborations") setTab("collabs");
    else if (params.tab === "messages") setTab("messages");
  }, [params.tab]);
  const isCollabs = tab === "collabs";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={["rgba(217,172,101,0.16)", "rgba(217,172,101,0.05)", "rgba(217,172,101,0)"]} locations={[0, 0.4, 1]} start={{ x: 0.85, y: 0 }} end={{ x: 0.2, y: 1 }} style={styles.ambient} pointerEvents="none" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Logo size={28} tagline={false} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Press onPress={() => setTab(isCollabs ? "messages" : "collabs")} style={[styles.roundBtn, isCollabs && goldGlow]} scaleTo={0.9}>
              {isCollabs ? <GoldFill style={{ borderRadius: 23 }} /> : <GlossFill style={{ borderRadius: 23 }} />}
              <Ionicons name="briefcase-outline" size={21} color={isCollabs ? colors.onPrimary : colors.ink} />
            </Press>
            <Press onPress={() => router.push("/marketplace")} style={styles.roundBtn} scaleTo={0.9}>
              <GlossFill style={{ borderRadius: 23 }} />
              <Ionicons name="person-add-outline" size={21} color={colors.ink} />
            </Press>
            <Press onPress={() => router.push("/notifications")} style={styles.roundBtn} scaleTo={0.9}>
              <GlossFill style={{ borderRadius: 23 }} />
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
            </Press>
          </View>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{isCollabs ? "Collabs" : "Messages"}</Text>
        </View>
        <Animated.View key={tab} entering={FadeIn.duration(220)}>
          {isCollabs ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <Collaborations />
            </View>
          ) : (
            <Messages />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: { position: "absolute", top: 0, left: 0, right: 0, height: 620 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: goldBorder, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  titleRow: { paddingHorizontal: 20, marginTop: 10 },
  title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 35, lineHeight: 42 },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, height: 54, borderRadius: radius.pill, paddingHorizontal: 18, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  input: { flex: 1, minWidth: 0, fontSize: 13, color: colors.ink, zIndex: 1 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.02)" },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  chipBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, overflow: "hidden" },
  chipBadgeText: { color: colors.onPrimary, fontSize: 11, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.7)" },
  avatarRing: { width: 74, height: 74, borderRadius: 37, padding: 2, overflow: "hidden" },
  avatarInner: { flex: 1, borderRadius: 35, overflow: "hidden", backgroundColor: "#141210", alignItems: "center", justifyContent: "center" },
  avatarMono: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 19 },
  name: { fontFamily: fonts.serif, color: colors.ink, fontSize: 17, flexShrink: 1 },
  rolePill: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  rolePillText: { color: colors.ink, fontSize: 10, fontWeight: "600" },
  time: { color: colors.muted, fontSize: 11 },
  preview: { flex: 1, color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  unreadText: { color: colors.onPrimary, fontSize: 11, fontWeight: "800" },
  conv: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 12, borderRadius: radius.lg },
  unread: { minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  wallet: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.night, borderRadius: radius.lg, padding: 16 },
  walletIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,90,54,0.18)", alignItems: "center", justifyContent: "center" },
  collab: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 12 },
  collabFoot: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
});

export default function Collabs() {
  const userId = useDB((s) => s.userId);
  if (!userId) return <GuestGate icon="chatbubble-ellipses-outline" title="Tes messages & collabs" text="Connecte-toi pour échanger avec les marques et suivre tes collaborations." />;
  return <CollabsInner />;
}
