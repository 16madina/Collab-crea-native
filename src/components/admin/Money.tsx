import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Badge, Banner, Card, Empty, fmtDate, Field, Label, Row, toast } from "../../kit";
import { displayName, fcfa, useDB } from "../../store";
import { COLLAB_LABEL, Withdrawal, WithdrawalStatus } from "../../types";
import { colors, radius, type } from "../../theme";
import { Button, Press } from "../../ui";
import { Grid, H, Item, StatTile, st } from "./common";
import { Sheet } from "./Sheet";

export function Commissions() {
  const collabs = useDB((s) => s.collaborations);
  const offers = useDB((s) => s.offers);
  const profiles = useDB((s) => s.profiles);
  const k = useMemo(() => {
    const done = collabs.filter((c) => c.status === "completed");
    const pending = collabs.filter((c) => !["completed", "cancelled", "refused"].includes(c.status));
    const sum = (a: typeof collabs) => a.reduce((t, c) => t + c.platform_fee, 0);
    const m = new Date();
    const month = done.filter((c) => { const d = new Date(c.created_at); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); });
    const counted = collabs.filter((c) => !["cancelled", "refused"].includes(c.status));
    return {
      perceived: sum(done), pending: sum(pending), total: sum(counted), month: sum(month),
      avg: counted.length ? sum(counted) / counted.length : 0, n: collabs.length,
      hist: [...collabs].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  }, [collabs]);
  const nm = (id: string) => displayName(profiles.find((p) => p.user_id === id));
  return (
    <View style={{ gap: 12 }}>
      <Grid>
        <StatTile i={0} label="Commissions perçues" value={fcfa(k.perceived)} icon="checkmark-done" tone="dark" />
        <StatTile i={1} label="En attente" value={fcfa(k.pending)} icon="hourglass" tone="primary" />
        <StatTile i={2} label="Total cumulé" value={fcfa(k.total)} icon="trending-up" />
        <StatTile i={3} label="Ce mois-ci" value={fcfa(k.month)} icon="calendar" />
      </Grid>
      <Card>
        <Row label="Taux de commission" value="10 % marque + 5 % créateur" />
        <Row label="Commission moyenne" value={fcfa(k.avg)} />
        <Row label="Collaborations" value={String(k.n)} bold />
      </Card>
      <H>Historique</H>
      {k.hist.length === 0 ? <Empty icon="receipt-outline" title="Aucune collaboration" /> : null}
      {k.hist.map((c, i) => (
        <Item key={c.id} i={i}>
          <View style={st.row}>
            <Text style={[st.name, { flex: 1 }]} numberOfLines={1}>{offers.find((o) => o.id === c.offer_id)?.title ?? "Offre"}</Text>
            <Badge label={COLLAB_LABEL[c.status]} tone={c.status === "completed" ? "success" : ["cancelled", "refused", "expired", "refunded"].includes(c.status) ? "muted" : "warning"} />
          </View>
          <Text style={type.small}>{fmtDate(c.created_at, true)} · {nm(c.brand_id)} → {nm(c.creator_id)}</Text>
          <View style={st.row}>
            <Text style={[type.small, { flex: 1 }]}>Montant {fcfa(c.agreed_amount)}</Text>
            <Text style={{ fontWeight: "800", color: colors.primary }}>+{fcfa(c.platform_fee)}</Text>
          </View>
        </Item>
      ))}
    </View>
  );
}

const W_STATUS: Record<WithdrawalStatus, [string, "warning" | "primary" | "success" | "danger"]> = {
  pending: ["En attente", "warning"], approved: ["Approuvé", "primary"], processing: ["En cours", "primary"], completed: ["Effectué", "success"], rejected: ["Refusé", "danger"],
};
const METHOD = { mobile_money: "Mobile Money", paypal: "PayPal", bank: "Virement bancaire" };

export function Withdrawals() {
  const ws = useDB((s) => s.withdrawals);
  const profiles = useDB((s) => s.profiles);
  const [sel, setSel] = useState<string | null>(null);
  const [proof, setProof] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const w = ws.find((x) => x.id === sel);
  const k = useMemo(() => {
    const open = ws.filter((x) => ["pending", "approved", "processing"].includes(x.status));
    return { pending: open.length, done: ws.filter((x) => x.status === "completed").length, due: open.reduce((t, x) => t + x.amount, 0) };
  }, [ws]);
  const isOpen = (x?: Withdrawal) => !!x && ["pending", "approved", "processing"].includes(x.status);
  const close = () => { setSel(null); setProof(false); setReason(""); };
  const finalize = () => {
    if (!w) return;
    if (!proof) return toast("Veuillez uploader la preuve du virement", "error");
    useDB.getState().adminFinalizeWithdrawal(w.id);
    toast("Retrait finalisé");
    close();
  };
  const auto = () => {
    if (!w) return;
    toast(w.method === "paypal" ? "PayPal payout envoyé !" : "Virement Mobile Money envoyé !");
    setBusy(true);
    const id = w.id;
    setTimeout(() => { useDB.getState().adminFinalizeWithdrawal(id); setBusy(false); toast("Retrait effectué"); close(); }, 1200);
  };
  const reject = () => {
    if (!w) return;
    if (!reason.trim()) return toast("Motif du refus requis", "error");
    useDB.getState().adminRejectWithdrawal(w.id, reason.trim());
    toast("Retrait refusé, solde restauré", "info");
    close();
  };
  return (
    <View style={{ gap: 12 }}>
      <Grid>
        <StatTile i={0} label="En attente" value={k.pending} icon="time" tone="primary" />
        <StatTile i={1} label="Effectués" value={k.done} icon="checkmark-done" />
      </Grid>
      <StatTile i={2} label="À verser" value={fcfa(k.due)} icon="cash" tone="dark" />
      {ws.length === 0 ? <Empty icon="wallet-outline" title="Aucune demande de retrait" /> : null}
      {ws.map((x, i) => (
        <Item key={x.id} i={i} onPress={() => setSel(x.id)}>
          <View style={st.row}>
            <Text style={[st.name, { flex: 1 }]}>{fcfa(x.amount)}</Text>
            <Badge label={W_STATUS[x.status][0]} tone={W_STATUS[x.status][1]} />
          </View>
          <Text style={type.small}>{displayName(profiles.find((p) => p.user_id === x.user_id))} · {METHOD[x.method]} · {fmtDate(x.created_at)}</Text>
        </Item>
      ))}
      <Sheet visible={!!w} onClose={close} title={w ? `Retrait ${fcfa(w.amount)}` : ""}
        footer={isOpen(w) ? (
          <>
            <Button label={busy ? "Envoi en cours…" : "Payout automatique"} icon="flash" onPress={busy ? undefined : auto} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button small label="Finaliser manuellement" icon={null} variant="dark" style={{ flex: 1 }} onPress={finalize} />
              <Button small label="Refuser" icon={null} variant="outline" style={{ flex: 1 }} onPress={reject} />
            </View>
          </>
        ) : undefined}>
        {w ? (
          <>
            <Row label="Bénéficiaire" value={displayName(profiles.find((p) => p.user_id === w.user_id))} />
            <Row label="Méthode" value={METHOD[w.method]} />
            {w.method === "mobile_money" ? (<><Row label="Opérateur" value={w.mobile_provider ?? "—"} /><Row label="Numéro" value={w.mobile_number ?? "—"} /></>) : null}
            {w.method === "paypal" ? (<><Row label="Email PayPal" value={w.paypal_email ?? "—"} /><Row label="Devise" value={w.payout_currency ?? "EUR"} /></>) : null}
            {w.method === "bank" ? <Row label="Banque" value="Coordonnées bancaires (RIB) au dossier" /> : null}
            <Row label="Statut" value={W_STATUS[w.status][0]} bold />
            {w.rejection_reason ? <Banner tone="danger">{`Motif : ${w.rejection_reason}`}</Banner> : null}
            {isOpen(w) ? (
              <>
                <Label>Preuve du virement</Label>
                <Press onPress={() => { setProof(true); toast("Preuve ajoutée", "info"); }} style={{ height: 90, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: proof ? colors.success : colors.line, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.surface }}>
                  <Ionicons name={proof ? "checkmark-circle" : "cloud-upload-outline"} size={26} color={proof ? colors.success : colors.muted} />
                  <Text style={type.small}>{proof ? "preuve_virement.jpg" : "Choisir une image"}</Text>
                </Press>
                <Field label="Motif du refus (si refus)" value={reason} onChangeText={setReason} />
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
