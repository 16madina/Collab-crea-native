// Scan du visage sur téléphone : caméra avant + détection du visage (Google ML Kit, sur l'appareil).
// La personne suit 5 consignes (devant, gauche, droite, haut, bas) ; chaque mouvement est réellement
// mesuré (angles de la tête), et 3 photos sont prises automatiquement (face, gauche, droite).
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Camera, CommonResolutions, useCameraPermission, VisionCamera } from "react-native-vision-camera";
import { createFaceDetectorOutput, type Face } from "react-native-vision-camera-face-detector";
import type { Picked } from "../../backend/upload";
import { Button } from "../../ui";
import { SCAN_STEPS, ScanOverlay, type ScanStep } from "./scanShared";

const PHOTO_STEPS: ScanStep[] = ["center", "left", "right"];
const TURN = 24; // degrés pour gauche / droite
const TILT = 14; // degrés pour haut / bas

export function FaceScan({ onDone, onCancel }: { onDone: (photos: Picked[]) => void; onCancel: () => void }) {
  const permission = useCameraPermission();
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!permission.hasPermission && permission.canRequestPermission) void permission.requestPermission().finally(() => setAsked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!permission.hasPermission)
    return (
      <View style={[StyleSheet.absoluteFill, st.center]}>
        {asked || !permission.canRequestPermission ? (
          <>
            <Text style={st.title}>Accès à la caméra</Text>
            <Text style={st.sub}>Autorisez la caméra dans les réglages du téléphone pour scanner votre visage.</Text>
            <Button label="Ouvrir les réglages" icon="settings-outline" onPress={() => void Linking.openSettings()} />
            <Button label="Annuler" variant="ghost" icon={null} onPress={onCancel} />
          </>
        ) : null}
      </View>
    );
  return <Scanner onDone={onDone} onCancel={onCancel} />;
}

type ScanUI = {
  setStep: (n: number) => void;
  setDone: (f: (d: ScanStep[]) => ScanStep[]) => void;
  setHint: (h: string | null) => void;
  setFaceSeen: (v: boolean) => void;
  setPhotos: (p: Picked[]) => void;
};

/**
 * Suivi du scan, hors rendu React : reçoit les visages détectés (plusieurs fois par seconde),
 * vérifie la consigne en cours et prend les photos. Les sorties caméra (visage + photo) sont créées ici.
 */
function createScan(ui: ScanUI) {
  const photo = VisionCamera.createPhotoOutput({
    targetResolution: CommonResolutions.HD_4_3,
    containerFormat: "jpeg",
    quality: 0.85,
    qualityPrioritization: "balanced",
    previewImageTargetSize: undefined,
  });
  const c = { step: 0, stepStart: Date.now(), hold: 0, signH: 0, signV: 0, over: false, hint: "" as string | null, seen: false };
  const shots: Promise<Picked | null>[] = [];

  const say = (h: string | null) => {
    if (c.hint !== h) {
      c.hint = h;
      ui.setHint(h);
    }
  };
  const seen = (v: boolean) => {
    if (c.seen !== v) {
      c.seen = v;
      ui.setFaceSeen(v);
    }
  };
  const capture = (key: ScanStep) =>
    photo
      .capturePhotoToFile({ enableShutterSound: false }, {})
      .then((f): Picked => ({ uri: f.filePath.startsWith("file://") ? f.filePath : `file://${f.filePath}`, mime: "image/jpeg", name: `${key}.jpg`, kind: "image" }))
      .catch(() => null);

  const complete = (key: ScanStep) => {
    if (PHOTO_STEPS.includes(key)) shots.push(capture(key));
    c.step += 1;
    c.stepStart = Date.now();
    c.hold = 0;
    ui.setDone((d) => [...d, key]);
    say(null);
    if (c.step >= SCAN_STEPS.length) {
      c.over = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void Promise.all(shots).then((list) => ui.setPhotos(list.filter((p): p is Picked => !!p)));
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    ui.setStep(c.step);
  };

  const onFaces = (faces: Face[]) => {
    if (c.over) return;
    const now = Date.now();
    const lost = (h: string) => {
      c.hold = 0;
      seen(false);
      say(h);
    };
    if (faces.length === 0) return lost("Placez votre visage dans le cercle");
    if (faces.length > 1) return lost("Une seule personne dans le cadre");
    const f = faces[0];
    const size = Math.max(f.bounds.width, f.bounds.height) / Math.min(f.frameWidth, f.frameHeight);
    if (size < 0.28) return lost("Rapprochez-vous un peu");
    if (size > 0.95) return lost("Éloignez-vous un peu");
    seen(true);
    const yaw = f.yawAngle;
    const pitch = f.pitchAngle;
    const key = SCAN_STEPS[c.step].key;
    let ok = false;
    let sign = 0;
    if (key === "center") ok = Math.abs(yaw) < 10 && Math.abs(pitch) < 10;
    else if (key === "left" || key === "right") {
      sign = Math.sign(yaw);
      // Le 2e côté doit être l'opposé du 1er : les deux profils sont bien vus.
      ok = Math.abs(yaw) > TURN && Math.abs(pitch) < 22 && (c.signH === 0 || sign === -c.signH);
    } else {
      sign = Math.sign(pitch);
      ok = Math.abs(pitch) > TILT && Math.abs(yaw) < 22 && (c.signV === 0 || sign === -c.signV);
    }
    if (!ok) {
      c.hold = 0;
      const slow = now - c.stepStart > 7000;
      return say(!slow ? null : key === "center" ? "Regardez bien l'écran, tête droite" : key === "up" || key === "down" ? "Inclinez un peu plus la tête" : "Tournez un peu plus la tête");
    }
    say(null);
    if (!c.hold) c.hold = now;
    if (now - c.hold < (key === "center" ? 700 : 250)) return;
    if (key === "left" || key === "right") c.signH = c.signH || sign;
    if (key === "up" || key === "down") c.signV = c.signV || sign;
    complete(key);
  };

  const face = createFaceDetectorOutput({ performanceMode: "accurate", cameraFacing: "front", onFacesDetected: onFaces, onError: () => {} });
  return { face, photo };
}

function Scanner({ onDone, onCancel }: { onDone: (photos: Picked[]) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<ScanStep[]>([]);
  const [hint, setHint] = useState<string | null>("Placez votre visage dans le cercle");
  const [faceSeen, setFaceSeen] = useState(false);
  const [photos, setPhotos] = useState<Picked[] | null>(null);
  const [scan] = useState(() => createScan({ setStep, setDone, setHint, setFaceSeen, setPhotos }));
  const finished = step >= SCAN_STEPS.length;

  // Laisse le temps de voir « Scan terminé » avant de passer à la suite.
  useEffect(() => {
    if (!photos) return;
    const t = setTimeout(() => onDone(photos), 1300);
    return () => clearTimeout(t);
  }, [photos, onDone]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}>
      <Camera style={StyleSheet.absoluteFill} device="front" isActive outputs={[scan.face, scan.photo]} resizeMode="cover" />
      <ScanOverlay step={step} done={done} hint={hint} finished={finished} faceSeen={faceSeen} onClose={onCancel} />
    </View>
  );
}

const st = StyleSheet.create({
  center: { backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  sub: { color: "rgba(255,255,255,0.65)", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
