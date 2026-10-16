// Aperçu web du scan du visage : même écran que sur téléphone, mais les étapes avancent toutes seules
// (pas de caméra ni de détection du visage dans le navigateur). Le vrai scan est dans FaceScan.native.tsx.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { Picked } from "../../backend/upload";
import { SCAN_STEPS, ScanOverlay, type ScanStep } from "./scanShared";

export function FaceScan({ onDone, onCancel }: { onDone: (photos: Picked[]) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<ScanStep[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) {
      const t = setTimeout(() => onDone([]), 1300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setDone((d) => [...d, SCAN_STEPS[step].key]);
      if (step + 1 >= SCAN_STEPS.length) setFinished(true);
      else setStep(step + 1);
    }, step === 0 ? 2200 : 1700);
    return () => clearTimeout(t);
  }, [step, finished, onDone]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
      <ScanOverlay
        step={step}
        done={done}
        finished={finished}
        faceSeen
        hint={step === 0 && !done.length ? "Aperçu : sur téléphone, la caméra suit vraiment vos mouvements" : null}
        onClose={onCancel}
        inside={
          <View style={{ flex: 1, backgroundColor: "#1A1712", alignItems: "center", justifyContent: "flex-end" }}>
            <Ionicons name="person" size={230} color="#3A332A" style={{ marginBottom: -30 }} />
          </View>
        }
      />
    </View>
  );
}
