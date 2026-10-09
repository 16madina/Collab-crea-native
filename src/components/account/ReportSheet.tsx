// Feuille de signalement réutilisable (utilisateur, offre, fraude).
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Field, toast } from "../../kit";
import { useDB } from "../../store";
import { colors, radius } from "../../theme";
import { ReportType } from "../../types";
import { Button, Press } from "../../ui";
import { Sheet } from "./Sheet";

export const REPORT_REASONS: Record<ReportType, string[]> = {
  user: [
    "Faux profil / Usurpation d'identité",
    "Harcèlement / Comportement inapproprié",
    "Spam / Contenu indésirable",
    "Arnaque / Tentative de fraude",
    "Autre raison",
  ],
  offer: ["Offre trompeuse / Fausses informations", "Arnaque / Tentative de fraude", "Contenu inapproprié", "Activité illégale", "Autre raison"],
  fraud: ["Fraude au paiement", "Vol d'identité", "Fausse collaboration", "Non-paiement après collaboration", "Autre fraude"],
};

const TITLES: Record<ReportType, string> = {
  user: "Signaler cet utilisateur",
  offer: "Signaler cette offre",
  fraud: "Signaler une fraude",
};

export function ReportSheet({
  visible,
  onClose,
  type,
  targetUserId,
  targetOfferId,
}: {
  visible: boolean;
  onClose: () => void;
  type: ReportType;
  targetUserId?: string;
  targetOfferId?: string;
}) {
  const report = useDB((s) => s.report);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails("");
    }
  }, [visible]);

  const submit = () => {
    if (!reason) return toast("Choisissez une raison", "error");
    report({ report_type: type, target_user_id: targetUserId, target_offer_id: targetOfferId, reason, description: details.trim() || undefined });
    toast("Signalement envoyé");
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={TITLES[type]}
      subtitle="Votre signalement est confidentiel et sera examiné par notre équipe."
      footer={<Button label="Envoyer le signalement" icon="flag-outline" onPress={submit} />}
    >
      <View style={{ gap: 8 }}>
        {REPORT_REASONS[type].map((r, i) => {
          const on = reason === r;
          return (
            <Animated.View key={r} entering={FadeInDown.delay(i * 40).springify()}>
              <Press
                onPress={() => setReason(r)}
                scaleTo={0.98}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: radius.md,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                  borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.line,
                }}
              >
                <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? colors.primary : colors.muted} />
                <Text style={{ flex: 1, fontWeight: "600", color: colors.ink }}>{r}</Text>
              </Press>
            </Animated.View>
          );
        })}
      </View>
      <Field label="Détails supplémentaires (optionnel)" value={details} onChangeText={setDetails} multiline maxLength={1000} placeholder="Décrivez la situation…" />
    </Sheet>
  );
}
