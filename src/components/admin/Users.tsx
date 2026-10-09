import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Badge, Chips, Empty, Field, Label, Segmented, toast } from "../../kit";
import { displayName, useDB } from "../../store";
import { NotificationType, Profile } from "../../types";
import { type } from "../../theme";
import { Avatar, Button } from "../../ui";
import { Act, Item, st } from "./common";
import { Sheet } from "./Sheet";

export const NOTIF_TYPES = [
  { value: "info", label: "Information" }, { value: "success", label: "Succès" }, { value: "warning", label: "Avertissement" },
  { value: "error", label: "Erreur" }, { value: "promotion", label: "Promotion" },
] as const;

type Mode = null | "warn" | "notify" | "email" | "ban";

export default function Users() {
  const profiles = useDB((s) => s.profiles);
  const templates = useDB((s) => s.templates);
  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<Profile | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [nType, setNType] = useState<NotificationType>("info");
  const [tpl, setTpl] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return profiles.filter((p) => p.role === role && (!s || [displayName(p), p.full_name, p.country, p.category].some((x) => x?.toLowerCase().includes(s))));
  }, [profiles, role, q]);

  const open = (p: Profile, m: Mode) => {
    setTarget(p); setMode(m); setTitle(""); setMsg(m === "email" ? `${p.user_id.replace("u_", "")}@exemple.com` : ""); setNType("info"); setTpl("");
  };
  const close = () => setMode(null);
  const db = useDB.getState;
  const submit = () => {
    if (!target) return;
    if (mode === "warn") {
      if (!msg.trim()) return toast("Message requis", "error");
      db().notify(target.user_id, "Avertissement", msg.trim(), "warning");
      toast("Avertissement envoyé");
    } else if (mode === "notify") {
      if (!title.trim() || !msg.trim()) return toast("Titre et message requis", "error");
      db().notify(target.user_id, title.trim(), msg.trim(), nType);
      toast("Notification envoyée");
    } else if (mode === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.trim())) return toast("Format d'email invalide", "error");
      toast("Email mis à jour");
    } else if (mode === "ban") {
      const ban = !target.is_banned;
      if (ban && !msg.trim()) return toast("Motif requis", "error");
      db().adminSetBan(target.user_id, ban, msg.trim() || undefined);
      toast(ban ? "Utilisateur banni" : "Utilisateur débanni");
    }
    close();
  };
  const name = target ? displayName(target) : "";
  const sheetTitle = { warn: `Avertir ${name}`, notify: `Notifier ${name}`, email: "Modifier l'email", ban: target?.is_banned ? `Débannir ${name}` : `Bannir ${name}` };

  return (
    <View style={{ gap: 12 }}>
      <Segmented options={[{ value: "creator", label: "Créateurs" }, { value: "brand", label: "Marques" }]} value={role} onChange={setRole} />
      <Field placeholder="Rechercher par nom, pays, catégorie…" value={q} onChangeText={setQ} />
      {list.length === 0 ? <Empty icon="people-outline" title={role === "creator" ? "Aucun créateur trouvé" : "Aucune marque trouvée"} /> : null}
      {list.map((p, i) => (
        <Item key={p.user_id} i={i}>
          <View style={st.row}>
            <Avatar uri={p.role === "brand" ? p.logo_url || p.avatar_url : p.avatar_url} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={st.row}>
                <Text style={st.name} numberOfLines={1}>{displayName(p)}</Text>
                {p.is_banned ? <Badge label="Banni" tone="danger" /> : null}
              </View>
              <Text style={type.small} numberOfLines={1}>{[p.country, p.role === "brand" ? p.sector : p.category].filter(Boolean).join(" · ") || "—"}</Text>
            </View>
          </View>
          <View style={st.wrap}>
            <Badge label={p.email_verified ? "Email ✓" : "Email"} tone={p.email_verified ? "success" : "muted"} />
            <Badge label={p.identity_verified ? "Identité ✓" : "Identité"} tone={p.identity_verified ? "success" : "muted"} />
          </View>
          <View style={st.wrap}>
            <Act label="Avertir" icon="warning-outline" onPress={() => open(p, "warn")} />
            <Act label="Notifier" icon="notifications-outline" onPress={() => open(p, "notify")} />
            <Act label="Email" icon="mail-outline" onPress={() => open(p, "email")} />
            <Act label={p.is_banned ? "Débannir" : "Bannir"} icon={p.is_banned ? "lock-open-outline" : "ban-outline"} tone={p.is_banned ? "success" : "danger"} onPress={() => open(p, "ban")} />
          </View>
        </Item>
      ))}
      <Sheet visible={!!mode} onClose={close} title={mode ? sheetTitle[mode] : ""}
        footer={<Button label={mode === "warn" ? "Envoyer un avertissement" : mode === "notify" ? "Envoyer une notification" : mode === "email" ? "Enregistrer" : target?.is_banned ? "Débannir" : "Bannir"} onPress={submit} icon={null} variant={mode === "ban" && !target?.is_banned ? "dark" : "primary"} />}>
        {mode === "notify" ? (
          <>
            <Label>Modèle prédéfini</Label>
            <Chips options={templates.map((t) => ({ value: t.id, label: t.name }))} value={tpl} onChange={(id: string) => {
              const t = templates.find((x) => x.id === id);
              setTpl(id); if (t) { setTitle(t.title); setMsg(t.message); setNType(t.type); }
            }} />
            <Field label="Titre *" value={title} onChangeText={setTitle} />
          </>
        ) : null}
        {mode === "email" ? (
          <Field label="Nouvel email" value={msg} onChangeText={setMsg} keyboardType="email-address" autoCapitalize="none" />
        ) : mode === "ban" && target?.is_banned ? (
          <Text style={type.body}>Motif actuel : {target.ban_reason || "—"}. Le compte sera réactivé.</Text>
        ) : (
          <Field label={mode === "ban" ? "Motif du bannissement *" : "Message *"} value={msg} onChangeText={setMsg} multiline style={{ minHeight: 100, textAlignVertical: "top" }} />
        )}
        {mode === "notify" ? (<><Label>Type</Label><Chips options={NOTIF_TYPES} value={nType} onChange={setNType} /></>) : null}
      </Sheet>
    </View>
  );
}
