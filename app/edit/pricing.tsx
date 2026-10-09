import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { money } from "../../src/components/account/constants";
import { Sheet } from "../../src/components/account/Sheet";
import { Card, Chips, Empty, Field, Label, Screen, Segmented, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, type } from "../../src/theme";
import { PricingItem, Profile } from "../../src/types";
import { Button, Press } from "../../src/ui";

type Cur = "XOF" | "EUR" | "USD";
const PLATFORMS = ["Snapchat", "TikTok", "Instagram", "YouTube"] as const;
type Plat = (typeof PLATFORMS)[number];
const TYPES: Record<Plat, string[]> = {
  Snapchat: ["Story", "Spotlight", "Post"],
  TikTok: ["Vidéo", "Live", "Série"],
  Instagram: ["Story", "Reel", "Post", "Carrousel", "Live"],
  YouTube: ["Vidéo", "Short", "Live"],
};
const QTY = ["1", "2", "3", "4", "5", "8", "10"];
const DURATIONS = ["Sans durée", "24h", "48h", "72h", "1 semaine", "2 semaines", "1 mois", "Illimitée"];
const FREQ = ["Sans fréquence", "1x/jour", "2x/jour", "3x/semaine", "1x/semaine", "2x/semaine", "1x/mois"];

export default function EditPricing() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  if (!me) return <Redirect href="/" />;
  return <Editor me={me} />;
}

function Editor({ me }: { me: Profile }) {
  const updateProfile = useDB((s) => s.updateProfile);
  const [currency, setCurrency] = useState<Cur>(me.pricing?.currency ?? "XOF");
  const [items, setItems] = useState<PricingItem[]>(me.pricing?.items ?? []);
  const [sheet, setSheet] = useState<"service" | "pack" | null>(null);

  // service
  const [plat, setPlat] = useState<Plat>("Instagram");
  const [kind, setKind] = useState("Story");
  const [qty, setQty] = useState("1");
  const [dur, setDur] = useState("Sans durée");
  const [freq, setFreq] = useState("Sans fréquence");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  // pack
  const [packName, setPackName] = useState("");
  const [packContent, setPackContent] = useState("");
  const [packPrice, setPackPrice] = useState("");

  const reset = () => {
    setPlat("Instagram");
    setKind("Story");
    setQty("1");
    setDur("Sans durée");
    setFreq("Sans fréquence");
    setDesc("");
    setPrice("");
    setPackName("");
    setPackContent("");
    setPackPrice("");
  };

  const addService = () => {
    const p = parseInt(price, 10);
    if (!p || p <= 0) return toast("Indiquez un prix valide", "error");
    const label = `${qty !== "1" ? `${qty}x ` : ""}${kind} ${plat}`;
    const extra = [plat !== "Snapchat" && dur !== "Sans durée" ? `Durée : ${dur}` : null, freq !== "Sans fréquence" ? `Fréquence : ${freq}` : null, desc.trim() || null].filter(Boolean).join(" · ");
    setItems([...items, { type: label, price: p, description: extra || undefined }]);
    setSheet(null);
    reset();
  };
  const addPack = () => {
    const p = parseInt(packPrice, 10);
    if (packName.trim().length < 2) return toast("Nom du pack requis", "error");
    if (!packContent.trim()) return toast("Décrivez le contenu du pack", "error");
    if (!p || p <= 0) return toast("Indiquez un prix valide", "error");
    setItems([...items, { type: `Pack ${packName.trim()}`, price: p, description: packContent.trim() }]);
    setSheet(null);
    reset();
  };

  const save = () => {
    updateProfile({ pricing: { currency, items } });
    toast("Tarifs enregistrés");
    router.back();
  };

  return (
    <Screen title="Mes tarifs" subtitle="Grille tarifaire visible par les marques" footer={<Button label="Enregistrer" icon="checkmark" style={{ flex: 1 }} onPress={save} />}>
      <Label>Devise</Label>
      <Segmented<Cur>
        value={currency}
        onChange={setCurrency}
        options={[
          { value: "XOF", label: "FCFA (XOF)" },
          { value: "EUR", label: "Euro" },
          { value: "USD", label: "Dollar" },
        ]}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Service" icon="add" small style={{ flex: 1 }} onPress={() => setSheet("service")} />
        <Button label="Pack" icon="cube-outline" small variant="outline" style={{ flex: 1 }} onPress={() => setSheet("pack")} />
      </View>

      {items.length === 0 ? (
        <Empty icon="pricetags-outline" title="Aucun tarif" text="Ajoutez vos services (Story, Reel, Vidéo…) ou créez un pack." />
      ) : (
        items.map((it, i) => (
          <Animated.View key={`${it.type}-${i}`} entering={FadeInDown.delay(i * 30).springify()} exiting={FadeOut} layout={LinearTransition.springify()}>
            <Card style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={it.type.startsWith("Pack") ? "cube-outline" : "pricetag-outline"} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{it.type}</Text>
                {it.description ? <Text style={type.tiny}>{it.description}</Text> : null}
                <Text style={{ fontWeight: "800", color: colors.primary, marginTop: 2 }}>{money(it.price, currency)}</Text>
              </View>
              <Press onPress={() => setItems(items.filter((_, j) => j !== i))} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FDE7E7", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={18} color="#C53030" />
              </Press>
            </Card>
          </Animated.View>
        ))
      )}

      <Sheet visible={sheet === "service"} onClose={() => setSheet(null)} title="Ajouter un service" footer={<Button label="Ajouter" icon="add" onPress={addService} />}>
        <Label>Plateforme</Label>
        <Chips
          options={PLATFORMS}
          value={plat}
          onChange={(v: Plat) => {
            setPlat(v);
            setKind(TYPES[v][0]);
          }}
        />
        <Label>Type de contenu</Label>
        <Chips options={TYPES[plat]} value={kind} onChange={setKind} />
        <Label>Quantité</Label>
        <Chips options={QTY} value={qty} onChange={setQty} />
        {plat !== "Snapchat" && (
          <>
            <Label>Durée de mise en ligne</Label>
            <Chips options={DURATIONS} value={dur} onChange={setDur} />
          </>
        )}
        <Label>Fréquence</Label>
        <Chips options={FREQ} value={freq} onChange={setFreq} />
        <Field label="Description (optionnel)" value={desc} onChangeText={setDesc} placeholder="Ex : avec lien en bio" />
        <Field label={`Prix (${currency === "XOF" ? "FCFA" : currency})`} value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="25000" />
        <View style={{ padding: 12, borderRadius: radius.md, backgroundColor: colors.surface }}>
          <Text style={type.tiny}>APERÇU</Text>
          <Text style={type.h3}>
            {qty !== "1" ? `${qty}x ` : ""}
            {kind} {plat} — {price ? money(parseInt(price, 10), currency) : "…"}
          </Text>
        </View>
      </Sheet>

      <Sheet visible={sheet === "pack"} onClose={() => setSheet(null)} title="Créer un pack" footer={<Button label="Créer le pack" icon="add" onPress={addPack} />}>
        <Field label="Nom du pack" value={packName} onChangeText={setPackName} placeholder="Lancement" />
        <Field label="Contenu" value={packContent} onChangeText={setPackContent} multiline placeholder="1 Reel + 3 Stories + 1 TikTok" />
        <Field label={`Prix (${currency === "XOF" ? "FCFA" : currency})`} value={packPrice} onChangeText={(t) => setPackPrice(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="200000" />
      </Sheet>
    </Screen>
  );
}
