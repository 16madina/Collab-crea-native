// Paiement en séquestre : Mobile Money via FedaPay ou FeexPay selon l'opérateur, carte bancaire via Stripe
// (réel sur téléphone, simulé dans l'aperçu web « demo »).
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { checkPayment, type PayStart, startCardPayment, startPayment } from "../../backend/payments";
import { refresh } from "../../backend/sync";
import { isLive } from "../../backend/upload";
import { Chips, Field, Label, Row, Segmented, toast } from "../../kit";
import { computeCommission, fcfa, useDB } from "../../store";
import { colors, radius, type } from "../../theme";
import { Button } from "../../ui";
import { InfoBox } from "./common";
import { Sheet } from "./Sheet";

// Pays et opérateurs proposés (le prestataire de chaque opérateur est choisi dans backend/payments.ts).
export const MOBILE_MONEY: { code: string; name: string; flag: string; prefix: string; digits: number; ops: string[] }[] = [
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", digits: 10, ops: ["Wave", "Orange", "MTN"] },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", digits: 10, ops: ["MTN", "Moov"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", digits: 8, ops: ["Moov"] },
];
// Opérateurs qui passent par une page de paiement (les autres envoient une demande sur le téléphone).
const PAGE: Record<string, string> = { Wave: "Wave", Orange: "Orange Money" };
const HINT: Record<string, string> = {
  Wave: "La page de paiement Wave va s'ouvrir : valide le paiement dans ton application Wave.",
  Orange: "La page de paiement Orange Money va s'ouvrir : suis les instructions pour valider le paiement.",
};
const RATES = { EUR: 655.957, USD: 600 } as const;
const POLL_MS = 4000;
const POLL_MAX = 75; // ≈ 5 minutes

type Pending = Pick<PayStart, "transactionId" | "paymentUrl" | "pushSent" | "gateway">;

/** Ferme la page de paiement ouverte dans l'app : seul iOS sait le faire (ailleurs, dismissBrowser n'existe pas). */
function closePaymentPage() {
  if (Platform.OS !== "ios") return;
  try {
    void WebBrowser.dismissBrowser().catch(() => {});
  } catch {
    // page déjà fermée
  }
}

export function PaymentSheet({ visible, onClose, collabId, title }: { visible: boolean; onClose: () => void; collabId: string; title?: string }) {
  const collab = useDB((s) => s.collaborations.find((c) => c.id === collabId));
  const pay = useDB((s) => s.pay);
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [country, setCountry] = useState("CI");
  const [op, setOp] = useState("Wave");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  // onClose change à chaque rendu du parent : on le garde dans une ref pour ne pas relancer l'attente.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Attente de la confirmation : on interroge le serveur (qui relit la transaction chez le prestataire).
  useEffect(() => {
    if (!pending || !visible) return;
    let tries = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      clearInterval(timer);
    };
    const timer = setInterval(async () => {
      if (stopped) return;
      tries += 1;
      if (tries > POLL_MAX) {
        stop();
        toast("Pas encore de confirmation : si tu as payé, la collaboration se mettra à jour toute seule", "info");
        return;
      }
      let r;
      try {
        r = await checkPayment(pending.gateway, pending.transactionId, collabId);
      } catch {
        return; // erreur réseau passagère : on réessaie au tour suivant
      }
      if (stopped) return;
      if (r.paid) {
        stop();
        setPending(null);
        toast("Paiement reçu — montant sécurisé en séquestre 🔒");
        onCloseRef.current();
        void refresh(useDB as never);
        closePaymentPage();
        return;
      }
      if (["declined", "canceled", "expired"].includes(r.status)) {
        stop();
        setPending(null);
        toast(r.status === "expired" ? "Le paiement a expiré, réessaie" : "Paiement refusé ou annulé", "error");
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pending, visible, collabId]);

  if (!collab) return null;
  const c = computeCommission(collab.agreed_amount);
  const cc = MOBILE_MONEY.find((x) => x.code === country)!;
  const total = method === "card" ? c.brand_total_card : c.brand_total;

  const openPage = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => toast("Impossible d'ouvrir la page de paiement", "error"));

  const submit = async () => {
    if (method === "mobile_money" && phone.replace(/\D/g, "").length < 8) return toast("Numéro Mobile Money invalide", "error");
    if (!isLive()) {
      // Aperçu web (données fictives) : paiement simulé.
      setBusy(true);
      setTimeout(() => {
        const r = pay(collab.id, method);
        setBusy(false);
        if (!r.ok) return toast(r.error, "error");
        toast("Paiement effectué — montant sécurisé en séquestre 🔒");
        onClose();
      }, 1200);
      return;
    }
    setBusy(true);
    try {
      const r = method === "card"
        ? await startCardPayment({ collaborationId: collab.id, currency })
        : await startPayment({ collaborationId: collab.id, operator: op, phone, country });
      setPending(r);
      if (r.paymentUrl) void openPage(r.paymentUrl);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const waiting = !!pending;

  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onClose}
      title={title ?? "Paiement sécurisé"}
      subtitle="Le montant est conservé en séquestre jusqu'à validation"
      footer={
        waiting ? (
          <View style={{ gap: 8 }}>
            {pending.paymentUrl ? <Button label="Rouvrir la page de paiement" icon="open-outline" onPress={() => void openPage(pending.paymentUrl!)} /> : null}
            <Button label="Changer de numéro ou d'opérateur" variant="outline" onPress={() => setPending(null)} />
          </View>
        ) : (
          <Button
            label={busy ? "Paiement en cours…" : `Payer ${method === "card" ? `${(total / RATES[currency]).toFixed(2)} ${currency === "EUR" ? "€" : "$"}` : fcfa(total)}`}
            icon={busy ? null : "lock-closed"}
            onPress={busy ? undefined : () => void submit()}
            style={busy ? { opacity: 0.7 } : undefined}
          />
        )
      }
    >
      {waiting ? (
        <Animated.View entering={FadeIn} style={{ gap: 14, alignItems: "center", paddingVertical: 10 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[type.body, { textAlign: "center" }]}>
            {pending.pushSent
              ? `Une demande de paiement de ${fcfa(total)} a été envoyée au ${cc.prefix} ${phone}. Confirme-la sur ton téléphone (code secret ${op}).`
              : pending.gateway === "stripe"
                ? `Termine le paiement de ${(total / RATES[currency]).toFixed(2)} ${currency === "EUR" ? "€" : "$"} sur la page de paiement sécurisée Stripe qui vient de s'ouvrir, puis reviens ici.`
                : `Termine le paiement de ${fcfa(total)} sur la page ${PAGE[op] ?? "de paiement"} qui vient de s'ouvrir, puis reviens ici.`}
          </Text>
          <Text style={[type.tiny, { textAlign: "center" }]}>{"En attente de la confirmation de l'opérateur…"}</Text>
        </Animated.View>
      ) : (
        <>
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
                options={MOBILE_MONEY.map((x) => ({ value: x.code, label: `${x.flag} ${x.name}` }))}
                value={country}
                onChange={(v: string) => {
                  setCountry(v);
                  setOp(MOBILE_MONEY.find((x) => x.code === v)!.ops[0]);
                }}
              />
              <Label>Opérateur</Label>
              <Chips options={cc.ops} value={op} onChange={setOp} />
              <Field label={`Numéro ${op} (${cc.prefix}, ${cc.digits} chiffres)`} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={cc.digits === 10 ? "07 00 00 00 00" : "90 00 00 00"} />
              <InfoBox icon="phone-portrait-outline">
                {HINT[op] ?? "Vous recevrez une demande de confirmation sur votre téléphone."}
              </InfoBox>
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
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  recap: { backgroundColor: "#FAF5F1", borderRadius: radius.md, padding: 14 },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
});
