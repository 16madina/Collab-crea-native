// Paiement en séquestre (simulé) : Mobile Money via FeexPay ou carte bancaire (+5 % de frais).
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Chips, Field, Label, Row, Segmented, toast } from "../../kit";
import { computeCommission, fcfa, useDB } from "../../store";
import { colors, radius, type } from "../../theme";
import { Button } from "../../ui";
import { InfoBox } from "./common";
import { Sheet } from "./Sheet";

export const FEEXPAY: { code: string; name: string; flag: string; prefix: string; ops: string[] }[] = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", ops: ["MTN", "Moov", "Celtiis"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", ops: ["Moov", "Orange"] },
  { code: "CG", name: "Congo-Brazzaville", flag: "🇨🇬", prefix: "+242", ops: ["MTN"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", ops: ["Wave", "MTN", "Moov", "Orange"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", ops: ["Wave", "Orange", "Free"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", ops: ["Togocom", "Moov"] },
];
const RATES = { EUR: 655.957, USD: 600 } as const;

export function PaymentSheet({ visible, onClose, collabId, title }: { visible: boolean; onClose: () => void; collabId: string; title?: string }) {
  const collab = useDB((s) => s.collaborations.find((c) => c.id === collabId));
  const pay = useDB((s) => s.pay);
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [country, setCountry] = useState("CI");
  const [op, setOp] = useState("Wave");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [busy, setBusy] = useState(false);

  if (!collab) return null;
  const c = computeCommission(collab.agreed_amount);
  const cc = FEEXPAY.find((x) => x.code === country)!;
  const total = method === "card" ? c.brand_total_card : c.brand_total;

  const submit = () => {
    if (method === "mobile_money" && phone.replace(/\D/g, "").length < 8) return toast("Numéro Mobile Money invalide", "error");
    setBusy(true);
    setTimeout(() => {
      const r = pay(collab.id, method);
      setBusy(false);
      if (!r.ok) return toast(r.error, "error");
      toast("Paiement effectué — montant sécurisé en séquestre 🔒");
      onClose();
    }, 1200);
  };

  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onClose}
      title={title ?? "Paiement sécurisé"}
      subtitle="Le montant est conservé en séquestre jusqu'à validation"
      footer={
        <Button
          label={busy ? "Paiement en cours…" : `Payer ${method === "card" ? `${(total / RATES[currency]).toFixed(2)} ${currency === "EUR" ? "€" : "$"}` : fcfa(total)}`}
          icon={busy ? null : "lock-closed"}
          onPress={busy ? undefined : submit}
          style={busy ? { opacity: 0.7 } : undefined}
        />
      }
    >
      <Segmented
        value={method}
        onChange={setMethod}
        options={[
          { value: "mobile_money", label: "📱 Mobile Money" },
          { value: "card", label: "💳 Carte bancaire" },
        ]}
      />
      {method === "mobile_money" ? (
        <Animated.View key="mm" entering={FadeIn} style={{ gap: 12 }}>
          <Label>Pays</Label>
          <Chips
            options={FEEXPAY.map((x) => ({ value: x.code, label: `${x.flag} ${x.name}` }))}
            value={country}
            onChange={(v: string) => {
              setCountry(v);
              setOp(FEEXPAY.find((x) => x.code === v)!.ops[0]);
            }}
          />
          <Label>Opérateur</Label>
          <Chips options={cc.ops} value={op} onChange={setOp} />
          <Field label={`Numéro ${op} (${cc.prefix})`} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="07 00 00 00 00" />
          <InfoBox icon="phone-portrait-outline">Vous recevrez une demande de confirmation sur votre téléphone.</InfoBox>
        </Animated.View>
      ) : (
        <Animated.View key="card" entering={FadeIn} style={{ gap: 12 }}>
          <Label>Devise de paiement</Label>
          <Chips
            options={[
              { value: "EUR", label: "€ Euro" },
              { value: "USD", label: "$ Dollar US" },
            ]}
            value={currency}
            onChange={setCurrency}
          />
          <InfoBox icon="card-outline">{`Taux : 1 ${currency} = ${RATES[currency]} FCFA. Des frais bancaires de 5 % s'appliquent.`}</InfoBox>
        </Animated.View>
      )}

      <View style={styles.recap}>
        <Row label="Montant convenu" value={fcfa(c.agreed_amount)} />
        <Row label="Frais de service (10 %)" value={fcfa(c.brandFee)} />
        {method === "card" ? <Row label="Frais bancaires (5 %)" value={fcfa(c.brand_total_card - c.brand_total)} /> : null}
        <View style={styles.sep} />
        <Row label="Total à payer" value={fcfa(total)} bold />
        {method === "card" ? <Row label={`Soit en ${currency}`} value={`${(total / RATES[currency]).toFixed(2)} ${currency === "EUR" ? "€" : "$"}`} /> : null}
        <Text style={[type.tiny, { marginTop: 6 }]}>Le créateur recevra {fcfa(c.creator_amount)} après validation (commission 5 %).</Text>
      </View>
      {busy ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={type.small}>Connexion sécurisée…</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={type.tiny}>Paiement chiffré et sécurisé</Text>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  recap: { backgroundColor: "#FAF5F1", borderRadius: radius.md, padding: 14 },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
});
