import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { InfoBox } from "../src/components/collab/common";
import { Sheet } from "../src/components/collab/Sheet";
import { Badge, Banner, Chip, Chips, Empty, Field, fmtDate, Label, Row, Screen, Segmented, toast } from "../src/kit";
import { fcfa, useDB, useMe, WITHDRAW_MIN } from "../src/store";
import { colors, radius, shadow, type } from "../src/theme";
import type { TxType, WithdrawalStatus } from "../src/types";
import { Button, Press } from "../src/ui";

const TX_LABEL: Record<TxType, [string, keyof typeof Ionicons.glyphMap]> = {
  release: ["Paiement reçu", "arrow-down-circle"],
  withdrawal: ["Retrait", "arrow-up-circle"],
  deposit: ["Dépôt", "add-circle"],
  refund: ["Remboursement", "return-down-back"],
  escrow: ["Séquestre", "lock-closed"],
};
const W_STATUS: Record<WithdrawalStatus, [string, "warning" | "primary" | "success" | "danger"]> = {
  pending: ["En attente", "warning"],
  approved: ["Approuvé", "primary"],
  processing: ["En cours", "primary"],
  completed: ["Traité", "success"],
  rejected: ["Rejeté", "danger"],
};
const PAYPAL_RATE = { EUR: 656, USD: 610 } as const;
const MM = [
  { value: "wave", label: "🌊 Wave" },
  { value: "orange", label: "🟠 Orange Money" },
];

function WithdrawalSheet({ visible, onClose, balance }: { visible: boolean; onClose: () => void; balance: number }) {
  const requestWithdrawal = useDB((s) => s.requestWithdrawal);
  const [method, setMethod] = useState<"mobile_money" | "paypal">("mobile_money");
  const [provider, setProvider] = useState("wave");
  const [num, setNum] = useState("");
  const [num2, setNum2] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [cur, setCur] = useState<"EUR" | "USD">("EUR");
  const [amount, setAmount] = useState("");

  const n = Number(amount.replace(/\s/g, "")) || 0;
  const min = WITHDRAW_MIN[method];
  const fee = Math.round(n * 0.02);
  const gross = n / PAYPAL_RATE[cur];
  const sym = cur === "EUR" ? "€" : "$";

  const submit = () => {
    if (method === "mobile_money") {
      if (num.replace(/\D/g, "").length < 8) return toast("Numéro invalide", "error");
      if (num.replace(/\D/g, "") !== num2.replace(/\D/g, "")) return toast("Les numéros ne correspondent pas", "error");
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Email PayPal invalide", "error");
      if (email.trim().toLowerCase() !== email2.trim().toLowerCase()) return toast("Les emails ne correspondent pas", "error");
    }
    const r = requestWithdrawal(
      method === "mobile_money"
        ? { amount: n, method, mobile_provider: provider, mobile_number: num.trim() }
        : { amount: n, method, paypal_email: email.trim(), payout_currency: cur },
    );
    if (!r.ok) return toast(r.error, "error");
    toast("Demande de retrait envoyée ✅");
    setAmount("");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Demander un retrait" subtitle={`Solde disponible : ${fcfa(balance)}`} footer={<Button label="Demander le retrait" icon="arrow-up" onPress={submit} />}>
      <Segmented
        value={method}
        onChange={setMethod}
        options={[
          { value: "mobile_money", label: "📱 Mobile Money" },
          { value: "paypal", label: "🅿️ PayPal" },
        ]}
      />
      <Field label="Montant (FCFA)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="10 000" hint={`Minimum : ${fcfa(min)} | Maximum : ${fcfa(balance)}`} error={n > balance ? "Montant supérieur au solde disponible" : undefined} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[25, 50, 100].map((p) => (
          <Chip key={p} label={p === 100 ? "Tout" : `${p} %`} onPress={() => setAmount(String(Math.floor((balance * p) / 100)))} />
        ))}
      </View>
      {method === "mobile_money" ? (
        <Animated.View key="mm" entering={FadeIn} style={{ gap: 12 }}>
          <Label>Opérateur *</Label>
          <Chips options={MM} value={provider} onChange={setProvider} />
          <Field label="Numéro *" value={num} onChangeText={setNum} keyboardType="phone-pad" placeholder="07 00 00 00 00" />
          <Field label="Confirmer le numéro *" value={num2} onChangeText={setNum2} keyboardType="phone-pad" placeholder="07 00 00 00 00" error={num2 && num2 !== num ? "Les numéros ne correspondent pas" : undefined} />
          {n > 0 ? (
            <View style={styles.recap}>
              <Row label="Montant demandé" value={fcfa(n)} />
              <Row label="Frais de retrait (~2 %)" value={`- ${fcfa(fee)}`} />
              <Row label="Vous recevrez environ" value={fcfa(n - fee)} bold />
              <Text style={type.tiny}>Les frais exacts dépendent de l'opérateur et du pays.</Text>
            </View>
          ) : null}
        </Animated.View>
      ) : (
        <Animated.View key="pp" entering={FadeIn} style={{ gap: 12 }}>
          <Label>Devise</Label>
          <Chips
            options={[
              { value: "EUR", label: "€ Euro" },
              { value: "USD", label: "$ Dollar US" },
            ]}
            value={cur}
            onChange={setCur}
          />
          <Field label="Email PayPal *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="vous@email.com" />
          <Field label="Confirmer l'email *" value={email2} onChangeText={setEmail2} keyboardType="email-address" autoCapitalize="none" placeholder="vous@email.com" />
          {n > 0 ? (
            <View style={styles.recap}>
              <Row label="Montant" value={`${gross.toFixed(2)} ${sym}`} />
              <Row label="Frais PayPal (2 %)" value={`- ${(gross * 0.02).toFixed(2)} ${sym}`} />
              <Row label="Vous recevrez environ" value={`${(gross * 0.98).toFixed(2)} ${sym}`} bold />
              <Text style={type.tiny}>
                Taux indicatif : 1 {cur} ≈ {PAYPAL_RATE[cur]} FCFA. Le taux réel peut varier.
              </Text>
            </View>
          ) : null}
        </Animated.View>
      )}
      <InfoBox icon="time-outline">Les retraits sont traités sous 24 à 72h ouvrées. Vous serez notifié à chaque étape.</InfoBox>
    </Sheet>
  );
}

export default function WalletScreen() {
  const me = useMe();
  const wallets = useDB((s) => s.wallets);
  const withdrawals = useDB((s) => s.withdrawals);
  const transactions = useDB((s) => s.transactions);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<"all" | "week" | "month">("all");
  const [proof, setProof] = useState<string | null>(null);

  const wallet = useMemo(() => wallets.find((w) => w.user_id === me?.user_id) ?? { balance: 0, pending_balance: 0 }, [wallets, me?.user_id]);
  const myW = useMemo(() => withdrawals.filter((w) => w.user_id === me?.user_id), [withdrawals, me?.user_id]);
  const pendingW = myW.filter((w) => ["pending", "approved", "processing"].includes(w.status));
  const doneW = myW.filter((w) => !["pending", "approved", "processing"].includes(w.status));
  const txs = useMemo(() => {
    const limit = period === "week" ? 7 : period === "month" ? 30 : Infinity;
    return transactions.filter((t) => t.user_id === me?.user_id && (Date.now() - new Date(t.created_at).getTime()) / 864e5 <= limit);
  }, [transactions, me?.user_id, period]);
  const earned = useMemo(() => transactions.filter((t) => t.user_id === me?.user_id && t.type === "release").reduce((a, t) => a + t.amount, 0), [transactions, me?.user_id]);

  const WRow = ({ w }: { w: (typeof myW)[number] }) => (
    <View style={styles.wRow}>
      <View style={styles.txIcon}>
        <Ionicons name={w.method === "paypal" ? "logo-paypal" : "phone-portrait-outline"} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.h3}>{fcfa(w.amount)}</Text>
        <Text style={type.tiny}>
          {w.method === "paypal" ? `PayPal · ${w.paypal_email}` : `${w.mobile_provider === "orange" ? "Orange Money" : "Wave"} · ${w.mobile_number}`} · {fmtDate(w.created_at)}
        </Text>
        {w.status === "rejected" && w.rejection_reason ? <Text style={[type.tiny, { color: "#C53030" }]}>Motif : {w.rejection_reason}</Text> : null}
        {w.proof_url ? (
          <Press onPress={() => setProof(w.id)}>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12, marginTop: 2 }}>📎 Preuve du virement</Text>
          </Press>
        ) : null}
      </View>
      <Badge label={W_STATUS[w.status][0]} tone={W_STATUS[w.status][1]} />
    </View>
  );

  if (me?.role !== "creator") {
    return (
      <Screen title="Portefeuille">
        <Empty icon="wallet-outline" title="Réservé aux créateurs" text="Le portefeuille permet aux créateurs de recevoir et retirer leurs gains." />
      </Screen>
    );
  }

  return (
    <Screen title="Mon portefeuille" subtitle="Gains et retraits">
      <Animated.View entering={FadeInDown.springify()} style={[styles.balance, shadow.soft]}>
        <LinearGradient colors={["#1E1E1E", "#121212"]} style={StyleSheet.absoluteFill} />
        <View style={styles.glow} />
        <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Solde disponible</Text>
        <Text style={{ color: "#fff", fontSize: 36, fontWeight: "800", letterSpacing: -1 }}>{fcfa(wallet.balance)}</Text>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <View>
            <Text style={styles.subLabel}>En attente</Text>
            <Text style={styles.subValue}>{fcfa(wallet.pending_balance)}</Text>
          </View>
          <View>
            <Text style={styles.subLabel}>Total gagné</Text>
            <Text style={styles.subValue}>{fcfa(earned)}</Text>
          </View>
        </View>
        <Button label="Retirer mes gains" icon="arrow-up" onPress={() => (wallet.balance < WITHDRAW_MIN.mobile_money ? toast(`Solde minimum pour un retrait : ${fcfa(WITHDRAW_MIN.mobile_money)}`, "error") : setOpen(true))} />
      </Animated.View>

      {pendingW.length ? (
        <Animated.View entering={FadeInDown.delay(60).springify()} style={{ gap: 10 }}>
          <Text style={type.h2}>Retraits en cours</Text>
          <View style={[styles.card, shadow.soft]}>
            {pendingW.map((w) => (
              <WRow key={w.id} w={w} />
            ))}
          </View>
        </Animated.View>
      ) : null}
      {doneW.length ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 10 }}>
          <Text style={type.h2}>Retraits traités</Text>
          <View style={[styles.card, shadow.soft]}>
            {doneW.map((w) => (
              <WRow key={w.id} w={w} />
            ))}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(140).springify()} style={{ gap: 10 }}>
        <Text style={type.h2}>Historique</Text>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "all", label: "Tout" },
            { value: "week", label: "Semaine" },
            { value: "month", label: "Mois" },
          ]}
        />
        {txs.length === 0 ? (
          <Empty icon="receipt-outline" title="Aucune transaction" text="Aucune transaction sur cette période." />
        ) : (
          <View style={[styles.card, shadow.soft]}>
            {txs.map((t) => {
              const [label, icon] = TX_LABEL[t.type];
              const pos = t.amount > 0;
              return (
                <Animated.View key={t.id} layout={LinearTransition} style={styles.wRow}>
                  <View style={[styles.txIcon, pos && { backgroundColor: "#E4F6EC" }]}>
                    <Ionicons name={icon} size={18} color={pos ? colors.success : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{label}</Text>
                    <Text style={type.tiny} numberOfLines={1}>
                      {t.label} · {fmtDate(t.created_at)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text style={{ fontWeight: "800", color: pos ? colors.success : colors.ink }}>
                      {pos ? "+" : "-"}
                      {fcfa(t.amount)}
                    </Text>
                    {t.status !== "completed" ? <Text style={type.tiny}>{t.status === "pending" ? "En attente" : t.status === "failed" ? "Échoué" : "Annulé"}</Text> : null}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </Animated.View>

      <WithdrawalSheet visible={open} onClose={() => setOpen(false)} balance={wallet.balance} />
      <Sheet visible={!!proof} onClose={() => setProof(null)} title="Preuve du virement">
        <Banner tone="success">Le virement a été effectué par Collab Créa. Conservez cette preuve pour vos archives.</Banner>
        {(() => {
          const w = myW.find((x) => x.id === proof);
          return w ? (
            <View style={styles.recap}>
              <Row label="Montant" value={fcfa(w.amount)} bold />
              <Row label="Méthode" value={w.method === "paypal" ? "PayPal" : w.mobile_provider === "orange" ? "Orange Money" : "Wave"} />
              <Row label="Destinataire" value={w.paypal_email ?? w.mobile_number ?? "—"} />
              <Row label="Date de demande" value={fmtDate(w.created_at, true)} />
              <Row label="Référence" value={`CC-${w.id.toUpperCase()}`} />
            </View>
          ) : null;
        })()}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { borderRadius: radius.xl, padding: 20, gap: 12, overflow: "hidden" },
  glow: { position: "absolute", right: -60, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,90,54,0.25)" },
  subLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  subValue: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 4 },
  wRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  txIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  recap: { backgroundColor: "#FAF5F1", borderRadius: radius.md, padding: 14 },
});
