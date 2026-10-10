// Sélecteur « Compte Marque / Compte Créateur » : bascule entre les deux espaces d'une même personne.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chips, Field, toast } from "../kit";
import { GoldButton, GoldFill, goldBorder, goldBorderStrong } from "../lux";
import { useDB, useMe } from "../store";
import { colors, radius } from "../theme";
import { Press } from "../ui";
import { Sheet } from "./account/Sheet";
import { CREATOR_CATEGORIES, SECTORS } from "./account/constants";

/** Bascule vers l'autre espace ; si l'espace n'existe pas encore, demande à le créer. */
export function useSpaceSwitch() {
  const me = useMe();
  const linked = useDB((s) => s.linked);
  const switchSpace = useDB((s) => s.switchSpace);
  const [creating, setCreating] = useState(false);
  const target: "brand" | "creator" = me?.role === "brand" ? "creator" : "brand";
  const go = () => {
    if (!me) return router.push("/auth/signup");
    if (!linked[me.user_id]) return router.push(`/space/new?role=${target}`);
    switchSpace();
    toast(target === "brand" ? "Espace Marque activé" : "Espace Créateur activé");
    router.replace("/(tabs)/home");
  };
  return { go, target, creating, setCreating };
}

export function SpaceSwitcher() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const sw = useSpaceSwitch();
  if (!me || me.role === "admin") return null;
  const isBrand = me.role === "brand";
  return (
    <>
      <Press onPress={() => setOpen(true)} style={styles.chip} scaleTo={0.95}>
        <Ionicons name={isBrand ? "briefcase-outline" : "person-outline"} size={15} color={colors.primary} />
        <Text style={styles.chipText}>{isBrand ? "Compte Marque" : "Compte Créateur"}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.ink} />
      </Press>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Changer d'espace" subtitle="Un seul compte, deux espaces séparés.">
        {(
          [
            ["creator", "Compte Créateur", "Portfolio, tarifs, candidatures et portefeuille", "person-outline"],
            ["brand", "Compte Marque", "Campagnes, recherche de créateurs et favoris", "briefcase-outline"],
          ] as const
        ).map(([role, title, sub, icon]) => {
          const on = me.role === role;
          return (
            <Press
              key={role}
              onPress={() => {
                setOpen(false);
                if (!on) setTimeout(sw.go, 250);
              }}
              style={[styles.option, on && { borderColor: "transparent" }]}
              scaleTo={0.97}
            >
              {on && <GoldFill style={{ borderRadius: radius.lg }} />}
              <Ionicons name={icon} size={24} color={on ? colors.onPrimary : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optTitle, on && { color: colors.onPrimary }]}>{title}</Text>
                <Text style={[styles.optSub, on && { color: "rgba(11,11,11,0.75)" }]}>{sub}</Text>
              </View>
              {on ? <Ionicons name="checkmark-circle" size={22} color={colors.onPrimary} /> : <Ionicons name="chevron-forward" size={18} color={colors.primary} />}
            </Press>
          );
        })}
      </Sheet>
    </>
  );
}

export function CreateSpaceSheet({ visible, onClose, role }: { visible: boolean; onClose: () => void; role: "brand" | "creator" }) {
  const createSpace = useDB((s) => s.createSpace);
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState<string>(SECTORS[0]);
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<string>(CREATOR_CATEGORIES[0]);
  const submit = () => {
    const r = role === "brand" ? createSpace({ company_name: company, sector, company_description: desc }) : createSpace({ category: cat, bio: desc });
    if (!r.ok) return toast(r.error, "error");
    toast(role === "brand" ? "Espace Marque créé 🎉" : "Espace Créateur créé 🎉");
    onClose();
    router.replace("/(tabs)/home");
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={role === "brand" ? "Créer mon espace Marque" : "Créer mon espace Créateur"}
      subtitle="Tes deux espaces gardent leurs données séparées."
      footer={<GoldButton label="Créer l'espace" size="lg" onPress={submit} style={{ alignSelf: "stretch" }} />}
    >
      {role === "brand" ? (
        <>
          <Field label="Nom de l'entreprise *" value={company} onChangeText={setCompany} placeholder="Ex : Glow&Care" />
          <Text style={styles.label}>Secteur d'activité *</Text>
          <Chips options={SECTORS} value={sector} onChange={setSector} />
          <Field label="Description" value={desc} onChangeText={setDesc} multiline placeholder="Présente ta marque en quelques mots" />
        </>
      ) : (
        <>
          <Text style={styles.label}>Catégorie principale *</Text>
          <Chips options={CREATOR_CATEGORIES} value={cat} onChange={setCat} />
          <Field label="Bio" value={desc} onChangeText={setDesc} multiline placeholder="Présente ton univers" />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", height: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "rgba(11,11,11,0.6)" },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: goldBorder, marginBottom: 10, overflow: "hidden" },
  optTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  optSub: { color: colors.inkSoft, fontSize: 11, marginTop: 2 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "700", marginTop: 6 },
});
