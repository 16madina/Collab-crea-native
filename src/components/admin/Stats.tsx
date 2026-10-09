import { useMemo } from "react";
import { Text, View } from "react-native";
import { Card, fmtDate, Row } from "../../kit";
import { displayName, useDB } from "../../store";
import { type } from "../../theme";
import { Grid, H, Item, StatTile, st } from "./common";

const ACTION_LABEL: Record<string, string> = {
  ban: "Bannissement", unban: "Débannissement", identity_approved: "Identité approuvée", identity_rejected: "Identité refusée",
  broadcast_notification: "Diffusion", report_dismiss: "Signalement rejeté", report_resolve: "Signalement résolu", report_ban: "Bannissement (signalement)",
};

export default function Stats() {
  const profiles = useDB((s) => s.profiles);
  const notifications = useDB((s) => s.notifications);
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const logs = useDB((s) => s.adminLogs);
  const k = useMemo(() => {
    const users = profiles.filter((p) => p.role !== "admin");
    const creators = users.filter((p) => p.role === "creator").length;
    const brands = users.filter((p) => p.role === "brand").length;
    const verified = users.filter((p) => p.identity_verified).length;
    return {
      creators, brands, verified, total: users.length,
      pending: users.filter((p) => p.identity_submitted_at && !p.identity_verified).length,
      banned: users.filter((p) => p.is_banned).length,
      rate: users.length ? Math.round((verified / users.length) * 100) : 0,
      ratio: brands ? (creators / brands).toFixed(1) : "—",
    };
  }, [profiles]);
  return (
    <View style={{ gap: 12 }}>
      <Grid>
        <StatTile i={0} label="Créateurs" value={k.creators} icon="sparkles" tone="dark" />
        <StatTile i={1} label="Marques" value={k.brands} icon="business" tone="primary" />
        <StatTile i={2} label="Vérifiés" value={k.verified} icon="shield-checkmark" />
        <StatTile i={3} label="En attente" value={k.pending} icon="time" />
        <StatTile i={4} label="Bannis" value={k.banned} icon="ban" />
        <StatTile i={5} label="Notifications" value={notifications.length} icon="notifications" />
        <StatTile i={6} label="Offres" value={offers.length} icon="megaphone" />
        <StatTile i={7} label="Candidatures" value={applications.length} icon="paper-plane" />
      </Grid>
      <H>Résumé</H>
      <Card>
        <Row label="Total utilisateurs" value={String(k.total)} />
        <Row label="Taux de vérification" value={`${k.rate} %`} />
        <Row label="Ratio créateurs/marques" value={`${k.ratio}`} bold />
      </Card>
      <H>Journal admin</H>
      {logs.length === 0 ? <Text style={type.small}>Aucune action enregistrée pour l'instant.</Text> : null}
      {logs.slice(0, 30).map((l, i) => {
        const p = profiles.find((x) => x.user_id === l.target_user_id);
        return (
          <Item key={l.id} i={i}>
            <View style={st.row}>
              <Text style={[st.name, { flex: 1 }]}>{ACTION_LABEL[l.action_type] ?? l.action_type}</Text>
              <Text style={type.tiny}>{fmtDate(l.created_at)} · {new Date(l.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
            {p ? <Text style={type.small}>Cible : {displayName(p)}</Text> : null}
          </Item>
        );
      })}
    </View>
  );
}
