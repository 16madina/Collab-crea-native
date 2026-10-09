import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Badge, Banner, Chips, Empty, fmtDate, Field, Label, Row, toast } from "../../kit";
import { displayName, useDB } from "../../store";
import { Profile, Report, SocialVerification } from "../../types";
import { colors, radius, type } from "../../theme";
import { Avatar, Button } from "../../ui";
import { Act, Item, Placeholder, st } from "./common";
import { Sheet } from "./Sheet";

const APPROVE_TPL = ["Approbation standard", "Bienvenue créateur", "Court & efficace", "Avec rappel sécurité"];
const REJECT = ["Document illisible", "Document non valide", "Profil incorrect", "Selfie non conforme", "Soupçon de fraude", "Document expiré"];

export function Identities() {
  const profiles = useDB((s) => s.profiles);
  const queue = useMemo(
    () => profiles.filter((p) => p.identity_submitted_at && !p.identity_verified).sort((a, b) => a.identity_submitted_at!.localeCompare(b.identity_submitted_at!)),
    [profiles],
  );
  const [cur, setCur] = useState<{ p: Profile; approve: boolean } | null>(null);
  const [choice, setChoice] = useState("");
  const confirm = () => {
    if (!cur) return;
    if (!choice) return toast(cur.approve ? "Choisissez un modèle" : "Choisissez un motif", "error");
    useDB.getState().adminReviewIdentity(cur.p.user_id, cur.approve, cur.approve ? undefined : choice);
    toast(cur.approve ? "Identité approuvée" : "Vérification refusée", cur.approve ? "success" : "info");
    setCur(null);
  };
  return (
    <View style={{ gap: 12 }}>
      {queue.length === 0 ? <Empty icon="shield-checkmark-outline" title="File vide" text="Aucune identité en attente de vérification." /> : null}
      {queue.map((p, i) => (
        <Item key={p.user_id} i={i}>
          <View style={st.row}>
            <Avatar uri={p.avatar_url} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{displayName(p)}</Text>
              <Text style={type.small}>Soumis le {fmtDate(p.identity_submitted_at, true)}</Text>
            </View>
            <Badge label={p.identity_method === "selfie" ? "Selfie" : "Document"} tone="dark" />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Image source={p.avatar_url} style={{ flex: 1, height: 120, borderRadius: radius.md }} contentFit="cover" />
            <Placeholder label="Pièce d'identité" icon="card-outline" h={120} />
            <Placeholder label="Selfie" icon="camera-outline" h={120} />
          </View>
          <View style={st.wrap}>
            <Act label="Approuver" icon="checkmark" tone="success" onPress={() => { setCur({ p, approve: true }); setChoice(APPROVE_TPL[0]); }} />
            <Act label="Refuser" icon="close" tone="danger" onPress={() => { setCur({ p, approve: false }); setChoice(""); }} />
          </View>
        </Item>
      ))}
      <Sheet visible={!!cur} onClose={() => setCur(null)} title={cur?.approve ? "Approuver l'identité" : "Refuser l'identité"}
        footer={<Button label={cur?.approve ? "Approuver" : "Refuser"} icon={null} variant={cur?.approve ? "primary" : "dark"} onPress={confirm} />}>
        <Label>{cur?.approve ? "Modèle de message" : "Motif du refus"}</Label>
        <Chips options={cur?.approve ? APPROVE_TPL : REJECT} value={choice} onChange={setChoice} />
      </Sheet>
    </View>
  );
}

export function Socials() {
  const all = useDB((s) => s.socialVerifications);
  const profiles = useDB((s) => s.profiles);
  const list = useMemo(() => all.filter((v) => v.status === "pending_admin"), [all]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const review = (v: SocialVerification, ok: boolean) => {
    useDB.getState().adminReviewSocial(v.id, ok, notes[v.id]);
    toast(ok ? "Réseau vérifié" : "Vérification refusée", ok ? "success" : "info");
  };
  return (
    <View style={{ gap: 12 }}>
      {list.length === 0 ? <Empty icon="logo-instagram" title="Aucune vérification en attente" /> : null}
      {list.map((v, i) => {
        const p = profiles.find((x) => x.user_id === v.user_id);
        const conf = v.ai_confidence ?? 0;
        return (
          <Item key={v.id} i={i}>
            <View style={st.row}>
              {p ? <Avatar uri={p.avatar_url} size={42} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{v.page_name}</Text>
                <Text style={type.small}>{displayName(p)} · {v.platform} · {v.claimed_followers} déclarés</Text>
              </View>
            </View>
            {v.screenshot_url ? <Image source={v.screenshot_url} style={{ height: 160, borderRadius: radius.md }} /> : <Placeholder label="Capture d'écran" icon="image-outline" h={140} />}
            <View style={{ backgroundColor: colors.night, borderRadius: radius.md, padding: 12, gap: 6 }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>✨ Analyse IA</Text>
              <Text style={{ color: "#ddd" }}>Nom détecté : {v.ai_extracted_name ?? "—"}</Text>
              <Text style={{ color: "#ddd" }}>Abonnés détectés : {v.ai_extracted_followers ?? "—"}</Text>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: "#333" }}>
                <View style={{ width: `${conf}%`, height: 6, borderRadius: 3, backgroundColor: conf >= 80 ? colors.success : colors.primary }} />
              </View>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Confiance {conf}%</Text>
            </View>
            <Field placeholder="Notes admin" value={notes[v.id] ?? ""} onChangeText={(t) => setNotes((n) => ({ ...n, [v.id]: t }))} />
            <View style={st.wrap}>
              <Act label="Approuver" icon="checkmark" tone="success" onPress={() => review(v, true)} />
              <Act label="Refuser" icon="close" tone="danger" onPress={() => review(v, false)} />
            </View>
          </Item>
        );
      })}
    </View>
  );
}

const R_STATUS: Record<Report["status"], [string, "warning" | "primary" | "success" | "muted"]> = {
  pending: ["En attente", "warning"], reviewed: ["En cours", "primary"], resolved: ["Résolu", "success"], dismissed: ["Rejeté", "muted"],
};
const R_TYPE = { user: "Utilisateur", offer: "Annonce", fraud: "Fraude" };

export function Moderation() {
  const reports = useDB((s) => s.reports);
  const profiles = useDB((s) => s.profiles);
  const offers = useDB((s) => s.offers);
  const [f, setF] = useState<"all" | Report["report_type"]>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const list = useMemo(() => reports.filter((r) => f === "all" || r.report_type === f), [reports, f]);
  const r = reports.find((x) => x.id === sel);
  const nm = (id?: string) => displayName(profiles.find((p) => p.user_id === id)) || "—";
  const act = (a: "dismiss" | "resolve" | "ban") => {
    if (!r) return;
    useDB.getState().adminReviewReport(r.id, a, notes.trim() || undefined);
    toast(a === "dismiss" ? "Signalement rejeté" : a === "resolve" ? "Signalement résolu" : "Utilisateur banni", a === "dismiss" ? "info" : "success");
    setSel(null);
  };
  return (
    <View style={{ gap: 12 }}>
      <Chips options={[{ value: "all", label: "Tous" }, { value: "user", label: "Utilisateurs" }, { value: "offer", label: "Annonces" }, { value: "fraud", label: "Fraudes" }]} value={f} onChange={setF} />
      {list.length === 0 ? <Empty icon="flag-outline" title="Aucun signalement" /> : null}
      {list.map((x, i) => (
        <Item key={x.id} i={i} onPress={() => { setSel(x.id); setNotes(x.admin_notes ?? ""); }}>
          <View style={st.row}>
            <Badge label={R_TYPE[x.report_type]} tone="dark" />
            <View style={{ flex: 1 }} />
            <Badge label={R_STATUS[x.status][0]} tone={R_STATUS[x.status][1]} />
          </View>
          <Text style={st.name}>{x.reason}</Text>
          <Text style={type.small}>Par {nm(x.reporter_id)} · {fmtDate(x.created_at)}</Text>
        </Item>
      ))}
      <Sheet visible={!!r} onClose={() => setSel(null)} title="Détail du signalement"
        footer={r && (r.status === "pending" || r.status === "reviewed") ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button small label="Rejeter" icon={null} variant="outline" style={{ flex: 1 }} onPress={() => act("dismiss")} />
            <Button small label="Résoudre" icon={null} style={{ flex: 1 }} onPress={() => act("resolve")} />
            {r.target_user_id ? <Button small label="Bannir" icon={null} variant="dark" style={{ flex: 1 }} onPress={() => act("ban")} /> : null}
          </View>
        ) : undefined}>
        {r ? (
          <>
            <Row label="Signalé par" value={nm(r.reporter_id)} />
            {r.target_user_id ? <Row label="Utilisateur signalé" value={nm(r.target_user_id)} /> : null}
            {r.target_offer_id ? <Row label="Annonce signalée" value={offers.find((o) => o.id === r.target_offer_id)?.title ?? "—"} /> : null}
            <Row label="Motif" value={r.reason} bold />
            <Label>Description</Label>
            <Text style={type.body}>{r.description || "—"}</Text>
            {r.status === "pending" || r.status === "reviewed" ? (
              <Field label="Notes admin" value={notes} onChangeText={setNotes} multiline />
            ) : (
              <Banner tone="info">{`Statut : ${R_STATUS[r.status][0]}${r.admin_notes ? ` — ${r.admin_notes}` : ""}`}</Banner>
            )}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
