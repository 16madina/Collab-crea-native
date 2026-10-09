import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { COLLAB_TYPES, CREATOR_CATEGORIES, SECTORS } from "../../src/components/account/constants";
import { CountrySelect, SelectField } from "../../src/components/account/widgets";
import { africanCountries, worldCountries } from "../../src/countries";
import { Card, Chips, Field, Label, Screen, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { type } from "../../src/theme";
import { Profile } from "../../src/types";
import { Button } from "../../src/ui";

export default function EditProfile() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  if (!me) return <Redirect href="/" />;
  return <Form me={me} />;
}

function Form({ me }: { me: Profile }) {
  const updateProfile = useDB((s) => s.updateProfile);
  const brand = me.role === "brand";
  const [name, setName] = useState(me.full_name);
  const [bio, setBio] = useState(me.bio ?? "");
  const [category, setCategory] = useState(me.category);
  const [country, setCountry] = useState(me.country);
  const [residence, setResidence] = useState(me.residence_country);
  const [company, setCompany] = useState(me.company_name ?? "");
  const [sector, setSector] = useState(me.sector);
  const [website, setWebsite] = useState(me.website ?? "");
  const [desc, setDesc] = useState(me.company_description ?? "");
  const [types, setTypes] = useState<string[]>(me.brand_prefs?.collaboration_types ?? []);
  const [cats, setCats] = useState<string[]>(me.brand_prefs?.target_categories ?? []);
  const [err, setErr] = useState<Record<string, string | undefined>>({});

  const save = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 100) e.name = "Entre 2 et 100 caractères";
    if (bio.length > 500) e.bio = "500 caractères maximum";
    if (brand) {
      if (company.trim().length < 2 || company.trim().length > 100) e.company = "Entre 2 et 100 caractères";
      if (desc.trim() && (desc.trim().length < 10 || desc.trim().length > 500)) e.desc = "Entre 10 et 500 caractères";
      const w = website.trim();
      if (w && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/.test(w)) e.website = "URL invalide";
    }
    setErr(e);
    if (Object.keys(e).length) return toast(Object.values(e)[0], "error");
    const w = website.trim();
    updateProfile({
      full_name: name.trim(),
      bio: bio.trim() || undefined,
      category,
      country,
      residence_country: residence,
      ...(brand
        ? {
            company_name: company.trim(),
            sector,
            website: w ? (/^https?:\/\//.test(w) ? w : `https://${w}`) : undefined,
            company_description: desc.trim() || undefined,
            brand_prefs: { collaboration_types: types, target_categories: cats },
          }
        : {}),
    });
    toast("Profil mis à jour");
    router.back();
  };

  return (
    <Screen title="Modifier le profil" footer={<Button label="Enregistrer" icon="checkmark" style={{ flex: 1 }} onPress={save} />}>
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
        <Card>
          <Field label={brand ? "Nom du responsable" : "Nom complet"} value={name} onChangeText={setName} maxLength={100} error={err.name} />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={500} placeholder="Parlez de vous, de votre univers…" error={err.bio} />
          <Text style={[type.tiny, { alignSelf: "flex-end" }]}>{bio.length}/500</Text>
          {!brand && <SelectField label="Catégorie" value={category} options={CREATOR_CATEGORIES} onChange={setCategory} />}
          <CountrySelect label="Pays de résidence" countries={worldCountries} value={residence} onChange={(c) => setResidence(c.name)} />
          <CountrySelect label="Pays d'origine" countries={africanCountries} value={country} onChange={(c) => setCountry(c.name)} />
        </Card>
      </Animated.View>
      {brand && (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={{ gap: 14 }}>
          <Card>
            <Text style={type.h3}>Entreprise</Text>
            <Field label="Nom de l'entreprise" value={company} onChangeText={setCompany} maxLength={100} error={err.company} />
            <SelectField label="Secteur" value={sector} options={SECTORS} onChange={setSector} />
            <Field label="Site web" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://" error={err.website} />
            <Field label="Description" value={desc} onChangeText={setDesc} multiline maxLength={500} error={err.desc} />
            <Text style={[type.tiny, { alignSelf: "flex-end" }]}>{desc.length}/500</Text>
          </Card>
          <Card>
            <Label>Types de collaboration</Label>
            <Chips options={COLLAB_TYPES} value={types} onChange={setTypes} multi />
            <Label>Catégories de créateurs</Label>
            <Chips options={CREATOR_CATEGORIES} value={cats} onChange={setCats} multi />
          </Card>
        </Animated.View>
      )}
    </Screen>
  );
}
