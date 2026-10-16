// Aperçu web de la photo de la pièce d'identité : pas de caméra dans le navigateur, on choisit une image.
import type { Picked } from "../../backend/upload";
import { DocCaptureUI, type DocSide } from "./docShared";

export function DocCapture(props: { side: DocSide; onDone: (p: Picked) => void; onCancel: () => void }) {
  return <DocCaptureUI {...props} />;
}
