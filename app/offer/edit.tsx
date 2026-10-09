import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { InfoBox, OFFER_CATEGORIES, OFFER_CONTENT_TYPES, SearchBar } from "../../src/components/collab/common";
import { Sheet } from "../../src/components/collab/Sheet";
import { africanCountries } from "../../src/countries";
import { Banner, Card, Chip, Chips, Field, Label, Screen, Segmented, toast } from "../../src/kit";
import { MIN_AGREED, useDB } from "../../src/store";
import { colors, radius, type } from "../../src/theme";
import type { Offer, OfferStatus, Slot } from "../../src/types";
import { Button, Press } from "../../src/ui";

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=70",
];

type BudgetType = "range" | "fixed" | "negotiable";
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());

function Option({ on, title, sub, onPress }: { on: boolean; title: string; sub?: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={[styles.opt, on && styles.optOn]} scaleTo={0.97}>
      <Text style={[type.h3, { fontSize: 12 }]}>{title}</Text>
      {sub ? <Text style={type.tiny}>{sub}</Text> : null}
    </Press>
  );
}

export default function EditOffer() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useDB((s) => (id ? s.offers.find((o) => o.id === id) : undefined));
  const saveOffer = useDB((s) => s.saveOffer);

  const initBudget: BudgetType = !existing ? "range" : existing.budget_min === 0 && existing.budget_max === 0 ? "negotiable" : existing.budget_min === existing.budget_max ? "fixed" : "range";
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [contentTypes, setContentTypes] = useState<string[]>(existing?.content_types ?? []);
  const [delivery, setDelivery] = useState<Offer["delivery_mode"]>(existing?.delivery_mode ?? "private");
  const [presence, setPresence] = useState<Offer["presence_mode"]>(existing?.presence_mode ?? "remote");
  const [filming, setFilming] = useState<Offer["filming_by"]>(existing?.filming_by ?? "creator");
  const [store, setStore] = useState(existing?.on_site_store_name ?? "");
  const [city, setCity] = useState(existing?.on_site_city ?? "");
  const [hood, setHood] = useState(existing?.on_site_neighborhood ?? "");
  const [slots, setSlots] = useState<Slot[]>(existing?.on_site_slots ?? []);
  const [budgetType, setBudgetType] = useState<BudgetType>(initBudget);
  const [bMin, setBMin] = useState(existing && initBudget !== "negotiable" ? String(existing.budget_min) : "");
  const [bMax, setBMax] = useState(existing && initBudget === "range" ? String(existing.budget_max) : "");
  const [countries, setCountries] = useState<string[]>(existing?.location ? existing.location.split(",").map((x) => x.trim()).filter(Boolean) : []);
  const [deadline, setDeadline] = useState(toDateInput(existing?.deadline));
  const [expectations, setExpectations] = useState(existing?.expectations ?? "");
  const [restrictions, setRestrictions] = useState(existing?.restrictions ?? "");
  const [phone, setPhone] = useState(existing?.creative_brief.phone ?? "");
  const [address, setAddress] = useState(existing?.creative_brief.address ?? "");
  const [hashtags, setHashtags] = useState(existing?.creative_brief.hashtags ?? "");
  const [mentions, setMentions] = useState(existing?.creative_brief.mentions ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [countryOpen, setCountryOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cq, setCq] = useState("");

  const minNum = Number(bMin.replace(/\s/g, "")) || 0;
  const lowBudget = budgetType !== "negotiable" && bMin !== "" && minNum < MIN_AGREED;
  const filteredCountries = useMemo(() => africanCountries.filter((c) => c.name.toLowerCase().includes(cq.trim().toLowerCase())), [cq]);

  const submit = (status: OfferStatus) => {
    if (deadline && !validDate(deadline)) return toast("Date limite invalide (format AAAA-MM-JJ)", "error");
    if (slots.some((s) => s.date && !validDate(s.date))) return toast("Date de créneau invalide (AAAA-MM-JJ)", "error");
    const min = budgetType === "negotiable" ? 0 : minNum;
    const max = budgetType === "negotiable" ? 0 : budgetType === "fixed" ? min : Number(bMax.replace(/\s/g, "")) || 0;
    if (budgetType !== "negotiable" && !bMin) return toast("Indiquez un montant", "error");
    const r = saveOffer({
      id: existing?.id,
      title: title.trim(),
      description: description.trim(),
      expectations: expectations.trim() || undefined,
      restrictions: restrictions.trim() || undefined,
      category,
      content_types: contentTypes,
      budget_min: min,
      budget_max: max,
      deadline: deadline ? new Date(`${deadline}T23:59:00`).toISOString() : undefined,
      location: countries.join(", ") || undefined,
      delivery_mode: delivery,
      presence_mode: presence,
      filming_by: filming,
      on_site_city: city.trim() || undefined,
      on_site_neighborhood: hood.trim() || undefined,
      on_site_store_name: store.trim() || undefined,
      on_site_slots: slots,
      creative_brief: { phone: phone.trim() || undefined, address: address.trim() || undefined, hashtags: hashtags.trim() || undefined, mentions: mentions.trim() || undefined },
      images,
      status,
    });
    if (!r.ok) return toast(r.error, "error");
    toast(status === "draft" ? "Brouillon enregistré" : existing ? "Offre mise à jour" : "Offre publiée 🎉");
    router.back();
  };

  const updateSlot = (i: number, patch: Partial<Slot>) => setSlots((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <Screen
      title={existing ? "Modifier l'offre" : "Nouvelle offre"}
      subtitle="Les champs * sont obligatoires"
      footer={
        <>
          <Button label="Enregistrer brouillon" variant="outline" icon={null} small onPress={() => submit("draft")} style={{ flex: 1 }} />
          <Button label={existing && existing.status !== "draft" ? "Mettre à jour" : "Publier l'offre"} small icon="checkmark" onPress={() => submit("active")} style={{ flex: 1.2 }} />
        </>
      }
    >
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
        <Field label="Titre *" value={title} onChangeText={setTitle} placeholder="Ex : Lancement de notre nouveau sérum" />
        <Field label="Description *" value={description} onChangeText={setDescription} multiline placeholder="Décrivez votre marque, votre produit et la campagne" />
        <Label>Catégorie *</Label>
        <Chips options={OFFER_CATEGORIES} value={category} onChange={setCategory} />
        <Label>Types de contenu *</Label>
        <Chips options={OFFER_CONTENT_TYPES} value={contentTypes} onChange={setContentTypes} multi />
      </Animated.View>

      <Card>
        <Label>Mode de livraison</Label>
        <View style={styles.optRow}>
          <Option on={delivery === "private"} title="📦 Livraison privée" sub="Contenu livré à la marque" onPress={() => setDelivery("private")} />
          <Option on={delivery === "network"} title="📱 Publication réseau" sub="Publié sur les réseaux du créateur" onPress={() => setDelivery("network")} />
        </View>
        <InfoBox>
          {delivery === "private"
            ? "Le créateur vous livre les fichiers/liens. Le paiement est libéré à votre validation (ou automatiquement après 7 jours)."
            : "Le créateur soumet un aperçu, vous l'approuvez, il publie puis soumet le lien. Le paiement est libéré après vérification de la publication."}
        </InfoBox>
      </Card>

      <Card>
        <Label>Mode de présence</Label>
        <View style={styles.optRow}>
          <Option on={presence === "remote"} title="🏠 À distance" onPress={() => setPresence("remote")} />
          <Option on={presence === "on_site"} title="📍 Sur place" onPress={() => setPresence("on_site")} />
        </View>
        {presence === "on_site" ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition.springify()} style={{ gap: 12 }}>
            <Label>Qui filme ?</Label>
            <View style={styles.optRow}>
              <Option on={filming === "creator"} title="🎥 Le créateur" onPress={() => setFilming("creator")} />
              <Option on={filming === "brand"} title="🎬 La marque" onPress={() => setFilming("brand")} />
            </View>
            {filming === "brand" ? <InfoBox icon="videocam-outline">Votre équipe filme sur place. Vous soumettrez le contenu et le créateur aura 48h pour le valider.</InfoBox> : null}
            <Field label="Nom du lieu" value={store} onChangeText={setStore} placeholder="Ex : Boutique Plateau" />
            <Field label="Ville *" value={city} onChangeText={setCity} placeholder="Ex : Abidjan" />
            <Field label="Quartier" value={hood} onChangeText={setHood} placeholder="Ex : Cocody" />
            <Label>Créneaux de disponibilité</Label>
            {slots.map((s, i) => (
              <Animated.View key={i} entering={FadeInDown.springify()} exiting={FadeOut} layout={LinearTransition} style={styles.slot}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Field value={s.date} onChangeText={(v) => updateSlot(i, { date: v })} placeholder="Date AAAA-MM-JJ" />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Field value={s.start_time} onChangeText={(v) => updateSlot(i, { start_time: v })} placeholder="09:00" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field value={s.end_time} onChangeText={(v) => updateSlot(i, { end_time: v })} placeholder="17:00" />
                    </View>
                  </View>
                </View>
                <Press onPress={() => setSlots((l) => l.filter((_, j) => j !== i))} style={styles.del}>
                  <Ionicons name="trash-outline" size={18} color="#C53030" />
                </Press>
              </Animated.View>
            ))}
            <Button label="Ajouter un créneau" variant="ghost" icon="add" small onPress={() => setSlots((l) => [...l, { date: "", start_time: "09:00", end_time: "17:00" }])} />
          </Animated.View>
        ) : null}
      </Card>

      <Card>
        <Label>Type de budget</Label>
        <Segmented
          value={budgetType}
          onChange={setBudgetType}
          options={[
            { value: "range", label: "Fourchette" },
            { value: "fixed", label: "Prix fixe" },
            { value: "negotiable", label: "Négociable" },
          ]}
        />
        {budgetType === "range" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Min (FCFA)" value={bMin} onChangeText={setBMin} keyboardType="numeric" placeholder="50 000" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Max (FCFA)" value={bMax} onChangeText={setBMax} keyboardType="numeric" placeholder="150 000" />
            </View>
          </View>
        ) : budgetType === "fixed" ? (
          <Field label="Montant (FCFA)" value={bMin} onChangeText={setBMin} keyboardType="numeric" placeholder="100 000" />
        ) : (
          <InfoBox>Le montant sera négocié avec chaque créateur dans la messagerie.</InfoBox>
        )}
        {lowBudget ? <Banner tone="warning">Le montant minimum est de 200 FCFA.</Banner> : null}
      </Card>

      <Card>
        <Label>Pays cibles</Label>
        <Press onPress={() => setCountryOpen(true)} style={styles.picker}>
          <Text style={[type.body, { flex: 1, color: countries.length ? colors.ink : colors.muted }]} numberOfLines={2}>
            {countries.length ? countries.join(", ") : "Tous les pays africains"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Press>
        <Field label="Date limite" value={deadline} onChangeText={setDeadline} placeholder="AAAA-MM-JJ" hint="Laissez vide pour une offre sans date limite" />
      </Card>

      <Field label="Ce que vous attendez" value={expectations} onChangeText={setExpectations} multiline placeholder="Ton, style, éléments à montrer…" />
      <Field label="Restrictions" value={restrictions} onChangeText={setRestrictions} multiline placeholder="Ce qu'il ne faut pas faire ou dire…" />

      <Card>
        <Label>Brief créatif</Label>
        <Text style={type.small}>Visible uniquement par les créateurs.</Text>
        <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+225 07 00 00 00 00" />
        <Field label="Adresse" value={address} onChangeText={setAddress} placeholder="Adresse à mentionner" />
        <Field label="Hashtags" value={hashtags} onChangeText={setHashtags} placeholder="#MaMarque #Promo" />
        <Field label="Mentions / textes" value={mentions} onChangeText={setMentions} multiline placeholder="@mamarque, phrase d'accroche…" />
      </Card>

      <Card>
        <Label>Photos du produit ({images.length}/3)</Label>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {images.map((u) => (
            <Animated.View key={u} entering={FadeIn} exiting={FadeOut}>
              <Image source={u} style={styles.photo} />
              <Press onPress={() => setImages((l) => l.filter((x) => x !== u))} style={styles.photoDel}>
                <Ionicons name="close" size={14} color="#fff" />
              </Press>
            </Animated.View>
          ))}
          {images.length < 3 ? (
            <Press onPress={() => setPhotoOpen(true)} style={[styles.photo, styles.addPhoto]}>
              <Ionicons name="camera-outline" size={26} color={colors.primary} />
              <Text style={type.tiny}>Ajouter</Text>
            </Press>
          ) : null}
        </View>
      </Card>

      <Sheet visible={countryOpen} onClose={() => setCountryOpen(false)} title="Pays cibles" subtitle="Vide = tous les pays africains" footer={<Button label={`Valider (${countries.length || "tous"})`} icon="checkmark" onPress={() => setCountryOpen(false)} />}>
        <SearchBar value={cq} onChange={setCq} placeholder="Rechercher un pays" />
        {countries.length ? (
          <Press onPress={() => setCountries([])}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Tout désélectionner</Text>
          </Press>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {filteredCountries.map((c) => {
            const on = countries.includes(c.name);
            return <Chip key={c.code} label={`${c.flag} ${c.name}`} on={on} onPress={() => setCountries((l) => (on ? l.filter((x) => x !== c.name) : [...l, c.name]))} />;
          })}
        </View>
      </Sheet>

      <Sheet visible={photoOpen} onClose={() => setPhotoOpen(false)} title="Choisir une photo" subtitle="Aperçu — l'envoi réel arrivera avec le back-end">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {SAMPLE_PHOTOS.filter((u) => !images.includes(u)).map((u) => (
            <Press
              key={u}
              onPress={() => {
                setImages((l) => (l.length >= 3 ? l : [...l, u]));
                setPhotoOpen(false);
              }}
            >
              <Image source={u} style={styles.photo} />
            </Press>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  optRow: { flexDirection: "row", gap: 10 },
  opt: { flex: 1, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, gap: 2 },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  slot: { flexDirection: "row", gap: 10, alignItems: "center", padding: 10, borderRadius: radius.md, backgroundColor: "#FAF5F1" },
  del: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FDE7E7", alignItems: "center", justifyContent: "center" },
  picker: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface },
  photo: { width: 92, height: 92, borderRadius: 16 },
  addPhoto: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primarySoft },
  photoDel: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
});
