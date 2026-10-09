import { useMemo, useState } from "react";
import { Switch, Text, View } from "react-native";
import { Badge, Card, Chips, Empty, fmtDate, Field, Label, toast } from "../../kit";
import { displayName, useDB } from "../../store";
import { NotificationTemplate, NotificationType } from "../../types";
import { colors, type } from "../../theme";
import { Button } from "../../ui";
import { Act, Grid, H, Item, StatTile, st } from "./common";
import { Sheet } from "./Sheet";
import { NOTIF_TYPES } from "./Users";

export function Legal() {
  const pages = useDB((s) => s.legalPages);
  const [slug, setSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const save = () => {
    if (!slug || !title.trim()) return toast("Titre requis", "error");
    useDB.getState().adminUpdateLegal(slug, title.trim(), content);
    toast("Page mise à jour avec succès");
    setSlug(null);
  };
  return (
    <View style={{ gap: 12 }}>
      {pages.length === 0 ? <Empty icon="document-text-outline" title="Aucune page légale" /> : null}
      {pages.map((p, i) => (
        <Item key={p.slug} i={i} onPress={() => { setSlug(p.slug); setTitle(p.title); setContent(p.content); }}>
          <View style={st.row}>
            <Text style={[st.name, { flex: 1 }]}>{p.title}</Text>
            <Badge label={`/${p.slug}`} tone="muted" />
          </View>
          <Text style={type.small} numberOfLines={2}>{p.content}</Text>
        </Item>
      ))}
      <Sheet visible={!!slug} onClose={() => setSlug(null)} title="Modifier la page" footer={<Button label="Enregistrer" icon="checkmark" onPress={save} />}>
        <Field label="Titre" value={title} onChangeText={setTitle} />
        <Field label="Contenu (Markdown)" value={content} onChangeText={setContent} multiline style={{ minHeight: 260, textAlignVertical: "top", fontFamily: "Courier" }} />
      </Sheet>
    </View>
  );
}

const TARGETS = [{ value: "all", label: "Tous les utilisateurs" }, { value: "creator", label: "Créateurs uniquement" }, { value: "brand", label: "Marques uniquement" }] as const;
type Target = (typeof TARGETS)[number]["value"];
const empty = { name: "", title: "", message: "", type: "info" as NotificationType };

export function Notifs() {
  const templates = useDB((s) => s.templates);
  const [edit, setEdit] = useState<(Omit<NotificationTemplate, "id"> & { id?: string }) | null>(null);
  const [b, setB] = useState({ title: "", message: "", type: "info" as NotificationType, target: "all" as Target });
  const [push, setPush] = useState({ title: "", body: "", target: "all" as Target });
  const saveTpl = () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.title.trim() || !edit.message.trim()) return toast("Tous les champs sont requis", "error");
    useDB.getState().adminSaveTemplate(edit);
    toast(edit.id ? "Modèle modifié" : "Modèle créé");
    setEdit(null);
  };
  const broadcast = () => {
    if (!b.title.trim() || !b.message.trim()) return toast("Titre et message requis", "error");
    const n = useDB.getState().adminBroadcast(b.target, b.title.trim(), b.message.trim(), b.type);
    if (n === 0) toast("Aucun destinataire", "info");
    else { toast(`Notification envoyée à ${n} utilisateur${n > 1 ? "s" : ""}`); setB({ ...b, title: "", message: "" }); }
  };
  const sendPush = () => {
    if (!push.title.trim() || !push.body.trim()) return toast("Titre et contenu requis", "error");
    toast("Notification push envoyée");
    setPush({ ...push, title: "", body: "" });
  };
  return (
    <View style={{ gap: 12 }}>
      <H right={<Act label="Nouveau" icon="add" tone="primary" onPress={() => setEdit({ ...empty })} />}>Modèles</H>
      {templates.length === 0 ? <Text style={type.small}>Aucun modèle.</Text> : null}
      {templates.map((t, i) => (
        <Item key={t.id} i={i}>
          <View style={st.row}>
            <Text style={[st.name, { flex: 1 }]}>{t.name}</Text>
            <Badge label={NOTIF_TYPES.find((x) => x.value === t.type)?.label ?? t.type} tone="muted" />
          </View>
          <Text style={type.small} numberOfLines={2}>{t.title} — {t.message}</Text>
          <View style={st.wrap}>
            <Act label="Modifier" icon="create-outline" onPress={() => setEdit({ ...t })} />
            <Act label="Supprimer" icon="trash-outline" tone="danger" onPress={() => { useDB.getState().adminDeleteTemplate(t.id); toast("Modèle supprimé", "info"); }} />
          </View>
        </Item>
      ))}
      <H>Diffusion in-app</H>
      <Card style={{ gap: 10 }}>
        <Chips options={TARGETS} value={b.target} onChange={(target: Target) => setB({ ...b, target })} />
        <Field label="Titre" value={b.title} onChangeText={(title) => setB({ ...b, title })} />
        <Field label="Message" value={b.message} onChangeText={(message) => setB({ ...b, message })} multiline />
        <Chips options={NOTIF_TYPES} value={b.type} onChange={(type: NotificationType) => setB({ ...b, type })} />
        <Button label="Diffuser" icon="megaphone-outline" onPress={broadcast} />
      </Card>
      <H>Notifications Push (Mobile)</H>
      <Card style={{ gap: 10 }}>
        <Field label="Titre" value={push.title} onChangeText={(title) => setPush({ ...push, title })} />
        <Field label="Contenu" value={push.body} onChangeText={(body) => setPush({ ...push, body })} multiline />
        <Chips options={TARGETS} value={push.target} onChange={(target: Target) => setPush({ ...push, target })} />
        <Button label="Envoyer le push" icon="phone-portrait-outline" variant="dark" onPress={sendPush} />
      </Card>
      <H>Email — Rappel "Finaliser & Télécharger l'app"</H>
      <Card style={{ gap: 10 }}>
        <Text style={type.small}>Relance par email les utilisateurs n'ayant pas finalisé leur profil.</Text>
        <Button label="Envoyer le rappel" icon="mail-outline" variant="outline" onPress={() => toast("Emails de rappel envoyés")} />
      </Card>
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Modifier le modèle" : "Nouveau modèle"} footer={<Button label="Enregistrer" icon="checkmark" onPress={saveTpl} />}>
        {edit ? (
          <>
            <Field label="Nom" value={edit.name} onChangeText={(name) => setEdit({ ...edit, name })} />
            <Field label="Titre" value={edit.title} onChangeText={(title) => setEdit({ ...edit, title })} />
            <Field label="Message" value={edit.message} onChangeText={(message) => setEdit({ ...edit, message })} multiline style={{ minHeight: 90, textAlignVertical: "top" }} />
            <Label>Type</Label>
            <Chips options={NOTIF_TYPES} value={edit.type} onChange={(type: NotificationType) => setEdit({ ...edit, type })} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

export function Invites() {
  const codes = useDB((s) => s.inviteCodes);
  const required = useDB((s) => s.inviteRequired);
  const profiles = useDB((s) => s.profiles);
  const [n, setN] = useState("5");
  const [note, setNote] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const k = useMemo(() => ({ total: codes.length, free: codes.filter((c) => c.is_active && !c.used_by).length, used: codes.filter((c) => c.used_by).length }), [codes]);
  const gen = () => {
    const num = Math.min(100, Math.max(1, parseInt(n, 10) || 0));
    const out = useDB.getState().adminGenerateCodes(num, note.trim() || undefined);
    toast(`${out.length} code(s) généré(s)`);
    setNote("");
  };
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>Codes d'invitation requis</Text>
          <Text style={type.small}>{required ? "L'inscription nécessite un code." : "Inscription libre."}</Text>
        </View>
        <Switch value={required} onValueChange={(v) => { useDB.getState().adminSetInviteRequired(v); toast(v ? "Codes requis activés" : "Codes requis désactivés", "info"); }} trackColor={{ true: colors.primary, false: colors.line }} thumbColor="#fff" />
      </Card>
      <Grid>
        <StatTile i={0} label="Total" value={k.total} icon="key" tone="dark" />
        <StatTile i={1} label="Disponibles" value={k.free} icon="checkmark-circle" />
        <StatTile i={2} label="Utilisés" value={k.used} icon="person" />
      </Grid>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 80 }}><Field label="Nombre" value={n} onChangeText={setN} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Note" placeholder="Note interne..." value={note} onChangeText={setNote} /></View>
        </View>
        <Button label="Générer" icon="sparkles" onPress={gen} />
      </Card>
      {codes.length === 0 ? <Empty icon="key-outline" title="Aucun code" /> : null}
      {codes.map((c, i) => {
        const u = profiles.find((p) => p.user_id === c.used_by);
        return (
          <Item key={c.code} i={i}>
            <View style={st.row}>
              <Text selectable style={{ flex: 1, fontFamily: "Courier", fontWeight: "800", fontSize: 14, color: colors.ink, letterSpacing: 1 }}>{c.code}</Text>
              <Badge label={c.used_by ? "Utilisé" : c.is_active ? "Actif" : "Inactif"} tone={c.used_by ? "muted" : c.is_active ? "success" : "warning"} />
            </View>
            {c.note ? <Text style={type.small}>{c.note}</Text> : null}
            {c.used_by ? <Text style={type.small}>Utilisé par {displayName(u) || c.used_by} · {fmtDate(c.used_at, true)}</Text> : null}
            {shown === c.code ? <Text selectable style={[type.tiny, { color: colors.primary }]}>Appui long sur le code pour le copier</Text> : null}
            <View style={st.wrap}>
              <Act label="Copier" icon="copy-outline" onPress={() => { setShown(c.code); toast(`Code ${c.code} prêt à copier`, "info"); }} />
              {!c.used_by ? <Act label={c.is_active ? "Désactiver" : "Activer"} icon={c.is_active ? "pause-outline" : "play-outline"} onPress={() => { useDB.getState().adminToggleCode(c.code); toast(c.is_active ? "Code désactivé" : "Code activé", "info"); }} /> : null}
              <Act label="Supprimer" icon="trash-outline" tone="danger" onPress={() => { useDB.getState().adminDeleteCode(c.code); toast("Code supprimé", "info"); }} />
            </View>
          </Item>
        );
      })}
    </View>
  );
}
