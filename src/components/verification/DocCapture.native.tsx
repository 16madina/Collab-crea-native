// Photo de la pièce d'identité sur téléphone : caméra arrière dans l'app, cadre au format carte.
import { StyleSheet } from "react-native";
import { Camera, CommonResolutions, useCameraPermission, usePhotoOutput } from "react-native-vision-camera";
import type { Picked } from "../../backend/upload";
import { DocCaptureUI, type DocSide } from "./docShared";

export function DocCapture(props: { side: DocSide; onDone: (p: Picked) => void; onCancel: () => void }) {
  const permission = useCameraPermission();
  const photo = usePhotoOutput({ targetResolution: CommonResolutions.FHD_4_3, containerFormat: "jpeg", quality: 0.9 });
  const shoot = async (): Promise<Picked | null> => {
    if (!permission.hasPermission && !(await permission.requestPermission())) throw new Error("Autorisez la caméra dans les réglages du téléphone");
    const f = await photo.capturePhotoToFile({ enableShutterSound: true }, {});
    return { uri: f.filePath.startsWith("file://") ? f.filePath : `file://${f.filePath}`, mime: "image/jpeg", name: `${Date.now()}.jpg`, kind: "image" };
  };
  return (
    <DocCaptureUI
      {...props}
      shoot={shoot}
      cameraLayer={permission.hasPermission ? <Camera style={StyleSheet.absoluteFill} device="back" isActive outputs={[photo]} resizeMode="cover" /> : undefined}
    />
  );
}
