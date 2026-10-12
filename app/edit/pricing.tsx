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
import { PricingItem, PricingOption, Profile } from "../../src/types";
import { Button, Press } from "../../src/ui";

type Cur = "XOF" | "EUR" | "USD";
const PLATFORMS = ["Snapchat", "TikTok", "Instagram", "YouTube", "Facebook"] as const;
type Plat = (typeof PLATFORMS)[number];
const TYPES: Record<Plat, string[]> = {
  Snapchat: ["Story", "Spotlight", "Post"],
  TikTok: ["Vidéo", "Live", "Série"],
  Instagram: ["Story", "Reel", "Post", "Carrousel", "Live"],
  YouTube: ["Vidéo", "Short", "Live"],
  Facebook: ["Vidéo", "Story", "Reel", "Post", "Live"],
};
// Catalogue : services courants, il ne reste qu'à saisir le prix.
const CATALOGUE: { type: string; description: string }[] = [
  { type: "Vidéo TikTok", description: "Jusqu'à 60 secondes" },
  { type: "Reel Instagram", description: "Jusqu'à 60 secondes" },
  { type: "Story Instagram (24 h)", description: "1 à 3 frames" },
  { type: "Vidéo YouTube", description: "5 à 10 minutes" },
  { type: "Short YouTube", description: "Jusqu'à 60 secondes" },
  { type: "Vidéo Facebook", description: "Jusqu'à 60 secondes" },
  { type: "Story Snapchat (24 h)", description: "1 à 3 frames" },
  { type: "Story Snapchat (48 h)", description: "1 à 3 frames" },
  { type: "Live TikTok", description: "Jusqu'à 1 heure" },
];
const PACK_PRESETS = ["Pack Essentiel", "Pack Premium", "Pack Découverte", "Partenariat mensuel"];
const OPTION_PRESETS = [
  "Droits d'utilisation (3 mois)",
  "Droits d'utilisation (6 mois)",
  "Exclusivité catégorie (1 mois)",
  "Création de script par l'influenceur",
  "Apparition en événement",
  "Collaboration à long terme (3 mois)",
  "Livraison express (48 h)",
];
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
  const [options, setOptions] = useState<PricingOption[]>(me.pricing?.options ?? []);
  const [sheet, setSheet] = useState<"service" | "pack" | "catalogue" | "option" | null>(null);
  // catalogue
  const [preset, setPreset] = useState<(typeof CATALOGUE)[number] | null>(null);
  const [presetPrice, setPresetPrice] = useState("");
  // option
  const [optLabel, setOptLabel] = useState(OPTION_PRESETS[0]);
  const [optUnit, setOptUnit] = useState<"%" | "amount">("%");
  const [optValue, setOptValue] = useState("");

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
    const n = packName.trim();
    setItems([...items, { type: /^(pack|partenariat)/i.test(n) ? n : `Pack ${n}`, price: p, description: packContent.trim() }]);
    setSheet(null);
    reset();
  };

  const addPreset = () => {
    const p = parseInt(presetPrice, 10);
    if (!preset) return;
    if (!p || p <= 0) return toast("Indiquez un prix valide", "error");
    setItems([...items, { type: preset.type, price: p, description: preset.description }]);
    setPreset(null);
    setPresetPrice("");
    setSheet(null);
  };
  const addOption = () => {
    const v = parseInt(optValue, 10);
    if (optLabel.trim().length < 2) return toast("Nom de l'option requis", "error");
    if (!v || v <= 0) return toast("Indiquez une valeur valide", "error");
    setOptions([...options, { label: optLabel.trim(), value: v, unit: optUnit }]);
    setOptValue("");
    setSheet(null);
  };

  const save = () => {
    updateProfile({ pricing: { currency, items, options } });
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
      <Button label="Catalogue des services" icon="albums-outline" small onPress={() => setSheet("catalogue")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Service sur mesure" icon="add" small variant="outline" style={{ flex: 1 }} onPress={() => setSheet("service")} />
        <Button label="Package" icon="cube-outline" small variant="outline" style={{ flex: 1 }} onPress={() => setSheet("pack")} />
      </View>
      <Button label="Option supplémentaire (+ % / + prix)" icon="options-outline" small variant="outline" onPress={() => setSheet("option")} />
      <Button label="Aperçu de ma grille tarifaire" icon="eye-outline" small variant="outline" onPress={() => { updateProfile({ pricing: { currency, items, options } }); router.push(`/rates/${me.user_id}`); }} />

      {items.length === 0 ? (
        <Empty icon="pricetags-outline" title="Aucun tarif" text="Ajoutez vos services (Story, Reel, Vidéo…) ou créez un pack." />
      ) : (
        items.map((it, i) => (
          <Animated.View key={`${it.type}-${i}`} entering={FadeInDown.delay(i * 30).duration(320)} exiting={FadeOut} layout={LinearTransition.duration(320)}>
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

      {options.length ? <Label>Options supplémentaires</Label> : null}
      {options.map((o, i) => (
        <Card key={`o${i}`} style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          <Text style={[type.h3, { flex: 1 }]}>{o.label}</Text>
          <Text style={{ fontWeight: "800", color: colors.primary }}>+ {o.unit === "%" ? `${o.value} %` : money(o.value, currency)}</Text>
          <Press onPress={() => setOptions(options.filter((_, j) => j !== i))} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Press>
        </Card>
      ))}

      <Sheet visible={sheet === "catalogue"} onClose={() => { setSheet(null); setPreset(null); }} title="Catalogue des services" subtitle="Choisissez un service puis indiquez votre prix" footer={preset ? <Button label="Ajouter à ma grille" icon="add" onPress={addPreset} /> : undefined}>
        {CATALOGUE.map((c) => {
          const on = preset?.type === c.type;
          return (
            <Press key={c.type} onPress={() => setPreset(c)} style={{ padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primarySoft : colors.surface }}>
              <Text style={type.h3}>{c.type}</Text>
              <Text style={type.tiny}>{c.description}</Text>
            </Press>
          );
        })}
        {preset ? <Field label={`Prix — ${preset.type} (${currency === "XOF" ? "FCFA" : currency})`} value={presetPrice} onChangeText={(t) => setPresetPrice(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="100000" /> : null}
      </Sheet>

      <Sheet visible={sheet === "option"} onClose={() => setSheet(null)} title="Option supplémentaire" subtitle="Droits d'utilisation, exclusivité, script…" footer={<Button label="Ajouter l'option" icon="add" onPress={addOption} />}>
        <Label>Option</Label>
        <Chips options={OPTION_PRESETS} value={optLabel} onChange={setOptLabel} />
        <Field label="Ou nom personnalisé" value={optLabel} onChangeText={setOptLabel} />
        <Label>Type de supplément</Label>
        <Segmented<"%" | "amount">
          value={optUnit}
          onChange={setOptUnit}
          options={[
            { value: "%", label: "Pourcentage (+ %)" },
            { value: "amount", label: `Montant (+ ${currency === "XOF" ? "FCFA" : currency})` },
          ]}
        />
        <Field label={optUnit === "%" ? "Pourcentage" : "Montant"} value={optValue} onChangeText={(t) => setOptValue(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={optUnit === "%" ? "50" : "300"} />
      </Sheet>

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
        <Chips options={PACK_PRESETS} value={packName} onChange={setPackName} />
        <Field label="Nom du package" value={packName} onChangeText={setPackName} placeholder="Pack Essentiel" />
        <Field label="Contenu" value={packContent} onChangeText={setPackContent} multiline placeholder="1 Reel + 3 Stories + 1 TikTok" />
        <Field label={`Prix (${currency === "XOF" ? "FCFA" : currency})`} value={packPrice} onChangeText={(t) => setPackPrice(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="200000" />
      </Sheet>
    </Screen>
  );
}
