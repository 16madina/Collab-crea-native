import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInLeft, FadeInRight, useAnimatedStyle, withSpring, ZoomIn } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import { ALL_PLATFORMS, COLLAB_TYPES, CREATOR_CATEGORIES, isEmail, PLATFORM, SAMPLE_AVATARS, SECTORS } from "../../src/components/account/constants";
import { PasswordField } from "../../src/components/account/PasswordField";
import { Sheet } from "../../src/components/account/Sheet";
import { Checkbox, CountrySelect, SelectField } from "../../src/components/account/widgets";
import { africanCountries, worldCountries } from "../../src/countries";
import { Chips, Field, Label, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Role, SocialPlatform } from "../../src/types";
import { Button, Press } from "../../src/ui";

type Step = 1 | 2 | 3 | 3.5 | 4;
type Errors = Record<string, string | undefined>;

function Dot({ active, done }: { active: boolean; done: boolean }) {
  const st = useAnimatedStyle(() => ({
    width: withSpring(active ? 28 : 10, { damping: 14 }),
    backgroundColor: active || done ? colors.primary : "#E6DAD2",
    opacity: withSpring(done && !active ? 0.55 : 1),
  }));
  return <Animated.View style={[{ height: 10, borderRadius: 5 }, st]} />;
}

const BRAND_SOCIALS: SocialPlatform[] = ["instagram", "facebook", "tiktok"];

export default function Signup() {
  const params = useLocalSearchParams<{ role?: string; code?: string }>();
  const inviteRequired = useDB((s) => s.inviteRequired);
  const inviteUnlocked = useDB((s) => s.inviteUnlocked);
  const signUp = useDB((s) => s.signUp);
  const updateProfile = useDB((s) => s.updateProfile);

  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState<1 | -1>(1);
  const [err, setErr] = useState<Errors>({});

  // étape 1
  const [avatar, setAvatar] = useState<string>();
  const [picker, setPicker] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  // étape 2
  const [residence, setResidence] = useState<{ name: string; phoneCode: string }>();
  const [origin, setOrigin] = useState<string>();
  const [phone, setPhone] = useState("");
  // étape 3
  const [role, setRole] = useState<Role | undefined>(params.role === "brand" ? "brand" : params.role === "creator" ? "creator" : undefined);
  const [networks, setNetworks] = useState<SocialPlatform[]>([]);
  // étape 3.5
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState<string>();
  const [website, setWebsite] = useState("");
  const [brandSocials, setBrandSocials] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [collabTypes, setCollabTypes] = useState<string[]>([]);
  const [targetCats, setTargetCats] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  // étape 4
  const [code, setCode] = useState(params.code ?? "");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inviteRequired && !inviteUnlocked) router.replace({ pathname: "/auth/invite", params: params.role ? { role: params.role } : {} });
  }, [inviteRequired, inviteUnlocked, params.role]);

  const steps: Step[] = useMemo(() => (role === "brand" ? [1, 2, 3, 3.5, 4] : [1, 2, 3, 4]), [role]);
  const idx = steps.indexOf(step);

  const validate = (): Errors => {
    const e: Errors = {};
    if (step === 1) {
      if (!avatar) e.avatar = "La photo de profil est obligatoire";
      if (first.trim().length < 2 || first.trim().length > 50) e.first = "Entre 2 et 50 caractères";
      if (last.trim().length < 2 || last.trim().length > 50) e.last = "Entre 2 et 50 caractères";
    } else if (step === 2) {
      if (!residence) e.residence = "Sélectionnez votre pays de résidence";
      if (!origin) e.origin = "Sélectionnez votre pays d'origine";
      if (!/^\d{6,15}$/.test(phone)) e.phone = "Numéro invalide (6 à 15 chiffres)";
    } else if (step === 3) {
      if (!role) e.role = "Choisissez votre profil";
      if (role === "creator" && networks.length === 0) e.networks = "Sélectionnez au moins un réseau social";
    } else if (step === 3.5) {
      if (company.trim().length < 2 || company.trim().length > 100) e.company = "Entre 2 et 100 caractères";
      if (!sector) e.sector = "Choisissez un secteur";
      if (website.trim() && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(normalizedSite())) e.website = "URL invalide";
      if (!collabTypes.length) e.collabTypes = "Sélectionnez au moins un type";
      if (!targetCats.length) e.targetCats = "Sélectionnez au moins une catégorie";
      if (description.trim().length < 10 || description.trim().length > 500) e.description = "Entre 10 et 500 caractères";
    } else {
      if (inviteRequired && !/^COLLAB-[A-Z0-9]{4}$/.test(code.trim().toUpperCase())) e.code = "Code d'invitation invalide";
      if (!isEmail(email)) e.email = "Email invalide";
      if (pw.length < 6) e.pw = "Minimum 6 caractères";
      if (pw2 !== pw) e.pw2 = "Les mots de passe ne correspondent pas";
      if (!terms) e.terms = "Vous devez accepter les conditions";
    }
    return e;
  };

  const normalizedSite = () => {
    const w = website.trim();
    return w && !/^https?:\/\//i.test(w) ? `https://${w}` : w;
  };

  const next = () => {
    const e = validate();
    setErr(e);
    if (Object.values(e).some(Boolean)) {
      toast(Object.values(e).find(Boolean)!, "error");
      return;
    }
    if (idx < steps.length - 1) {
      setDir(1);
      setStep(steps[idx + 1]);
    } else submit();
  };

  const back = () => {
    setErr({});
    if (idx > 0) {
      setDir(-1);
      setStep(steps[idx - 1]);
    } else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const full_name = `${first.trim()} ${last.trim()}`;
      const r = signUp({
        email: email.trim().toLowerCase(),
        inviteCode: inviteRequired ? code.trim().toUpperCase() : undefined,
        role: role!,
        full_name,
        avatar_url: avatar!,
        country: origin,
        residence_country: residence?.name,
        ...(role === "brand"
          ? {
              company_name: company.trim(),
              sector,
              website: normalizedSite() || undefined,
              company_description: description.trim(),
              logo_url: avatar,
              brand_prefs: { collaboration_types: collabTypes, target_categories: targetCats },
            }
          : {}),
      });
      if (!r.ok) return toast(r.error, "error");
      if (role === "creator") updateProfile({ followers: Object.fromEntries(networks.map((n) => [n, ""])) });
      toast("Compte créé avec succès !");
      router.replace("/(tabs)/home");
    }, 600);
  };

  const entering = (dir === 1 ? FadeInRight : FadeInLeft).springify().damping(18);
  const titles: Record<string, [string, string]> = {
    "1": ["Faisons connaissance", "Ajoutez une photo et votre nom."],
    "2": ["D'où venez-vous ?", "Votre pays nous aide à vous proposer des offres adaptées."],
    "3": ["Vous êtes…", "Choisissez votre profil sur Collab Créa."],
    "3.5": ["Votre entreprise", "Présentez votre marque aux créateurs."],
    "4": ["Dernière étape", "Créez vos identifiants de connexion."],
  };
  const [title, sub] = titles[String(step)];

  return (
    <AuthShell
      onBack={back}
      title={title}
      subtitle={sub}
      top={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {steps.map((s, i) => (
            <Dot key={s} active={i === idx} done={i < idx} />
          ))}
          <Text style={[type.tiny, { marginLeft: "auto" }]}>
            Étape {idx + 1} sur {steps.length}
          </Text>
        </View>
      }
    >
      <Animated.View key={String(step)} entering={entering} style={{ gap: 16 }}>
        {step === 1 && (
          <>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Press onPress={() => setPicker(true)} style={[styles.avatarPick, !!err.avatar && { borderColor: "#E5484D" }]} scaleTo={0.94}>
                {avatar ? (
                  <Animated.View entering={ZoomIn.springify()} style={StyleSheet.absoluteFill}>
                    <Image source={avatar} style={{ flex: 1 }} contentFit="cover" />
                  </Animated.View>
                ) : (
                  <Ionicons name="camera-outline" size={34} color={colors.primary} />
                )}
                <View style={styles.avatarPlus}>
                  <Ionicons name={avatar ? "pencil" : "add"} size={16} color="#fff" />
                </View>
              </Press>
              <Text style={[type.small, err.avatar && { color: "#E5484D" }]}>{err.avatar ?? "Photo de profil (obligatoire)"}</Text>
            </View>
            <Field label="Prénom" value={first} onChangeText={setFirst} maxLength={50} placeholder="Aïcha" error={err.first} autoComplete="given-name" />
            <Field label="Nom" value={last} onChangeText={setLast} maxLength={50} placeholder="Koné" error={err.last} autoComplete="family-name" />
          </>
        )}

        {step === 2 && (
          <>
            <CountrySelect label="Pays de résidence" countries={worldCountries} value={residence?.name} onChange={(c) => setResidence(c)} error={err.residence} />
            <CountrySelect label="Pays d'origine" countries={africanCountries} value={origin} onChange={(c) => setOrigin(c.name)} error={err.origin} />
            <View style={{ gap: 6 }}>
              <Label>Téléphone</Label>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={styles.prefix}>
                  <Text style={{ fontWeight: "700", color: colors.ink }}>{residence?.phoneCode ?? "+…"}</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 15))}
                  keyboardType="phone-pad"
                  placeholder="0707070707"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { flex: 1 }, !!err.phone && { borderColor: "#E5484D" }]}
                />
              </View>
              {err.phone ? <Text style={styles.error}>{err.phone}</Text> : <Text style={type.tiny}>Le préfixe suit votre pays de résidence.</Text>}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(
                [
                  ["creator", "Créateur", "Influenceur, artiste", "sparkles"],
                  ["brand", "Marque", "Entreprise, agence", "briefcase"],
                ] as const
              ).map(([r, l, d, ic]) => {
                const on = role === r;
                return (
                  <Press key={r} onPress={() => setRole(r)} scaleTo={0.96} style={[styles.roleCard, on && styles.roleOn, on && shadow.glow]}>
                    <View style={[styles.roleIcon, on && { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                      <Ionicons name={ic} size={26} color={on ? "#fff" : colors.primary} />
                    </View>
                    <Text style={[type.h3, on && { color: "#fff" }]}>{l}</Text>
                    <Text style={[type.small, on && { color: "rgba(255,255,255,0.8)" }]}>{d}</Text>
                    {on ? (
                      <Animated.View entering={ZoomIn.springify()} style={{ position: "absolute", top: 12, right: 12 }}>
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      </Animated.View>
                    ) : null}
                  </Press>
                );
              })}
            </View>
            {err.role ? <Text style={styles.error}>{err.role}</Text> : null}
            {role === "creator" && (
              <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
                <Label>Vos réseaux sociaux</Label>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {ALL_PLATFORMS.map((p) => {
                    const on = networks.includes(p);
                    return (
                      <Press
                        key={p}
                        onPress={() => setNetworks(on ? networks.filter((x) => x !== p) : [...networks, p])}
                        scaleTo={0.94}
                        style={[styles.netChip, on && { backgroundColor: PLATFORM[p].color, borderColor: PLATFORM[p].color }]}
                      >
                        <Ionicons name={PLATFORM[p].icon} size={18} color={on ? "#fff" : PLATFORM[p].color} />
                        <Text style={{ fontWeight: "700", color: on ? "#fff" : colors.ink }}>{PLATFORM[p].label}</Text>
                      </Press>
                    );
                  })}
                </View>
                {err.networks ? <Text style={styles.error}>{err.networks}</Text> : <Text style={type.tiny}>Sélectionnez au moins un réseau.</Text>}
              </Animated.View>
            )}
          </>
        )}

        {step === 3.5 && (
          <>
            <Field label="Nom de l'entreprise" value={company} onChangeText={setCompany} maxLength={100} placeholder="Glow&Care" error={err.company} />
            <SelectField label="Secteur" value={sector} options={SECTORS} onChange={setSector} placeholder="Choisir un secteur" />
            {err.sector ? <Text style={[styles.error, { marginTop: -10 }]}>{err.sector}</Text> : null}
            <Field
              label="Site web (optionnel)"
              value={website}
              onChangeText={setWebsite}
              onBlur={() => setWebsite(normalizedSite())}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://monentreprise.com"
              error={err.website}
            />
            <Label>Réseaux sociaux (optionnel)</Label>
            {BRAND_SOCIALS.map((p) => (
              <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: -6 }}>
                <View style={[styles.netIcon, { backgroundColor: PLATFORM[p].color }]}>
                  <Ionicons name={PLATFORM[p].icon} size={18} color="#fff" />
                </View>
                <TextInput
                  value={brandSocials[p] ?? ""}
                  onChangeText={(t) => setBrandSocials({ ...brandSocials, [p]: t })}
                  placeholder={`@${PLATFORM[p].label.toLowerCase()}`}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
            ))}
            <Label>Types de collaboration</Label>
            <Chips options={COLLAB_TYPES} value={collabTypes} onChange={setCollabTypes} multi />
            {err.collabTypes ? <Text style={styles.error}>{err.collabTypes}</Text> : null}
            <Label>Catégories de créateurs recherchées</Label>
            <Chips options={CREATOR_CATEGORIES} value={targetCats} onChange={setTargetCats} multi />
            {err.targetCats ? <Text style={styles.error}>{err.targetCats}</Text> : null}
            <Field label="Description" value={description} onChangeText={setDescription} multiline maxLength={500} placeholder="Présentez votre entreprise, vos valeurs, vos produits…" error={err.description} />
            <Text style={[type.tiny, { alignSelf: "flex-end", marginTop: -8 }]}>{description.length}/500</Text>
          </>
        )}

        {step === 4 && (
          <>
            {inviteRequired && <Field label="Code d'invitation" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" placeholder="COLLAB-XXXX" error={err.code} />}
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="vous@exemple.com" error={err.email} />
            <PasswordField label="Mot de passe" value={pw} onChangeText={setPw} error={err.pw} placeholder="Minimum 6 caractères" />
            <PasswordField label="Confirmer le mot de passe" value={pw2} onChangeText={setPw2} error={err.pw2} placeholder="••••••" />
            <Checkbox value={terms} onChange={setTerms}>
              <Text style={[type.small, { color: colors.inkSoft }, err.terms && !terms && { color: "#E5484D" }]}>
                J'accepte les{" "}
                <Text style={styles.link} onPress={() => router.push("/legal/terms")}>
                  Conditions générales d'utilisation
                </Text>{" "}
                et la{" "}
                <Text style={styles.link} onPress={() => router.push("/legal/privacy")}>
                  Politique de confidentialité
                </Text>
                .
              </Text>
            </Checkbox>
          </>
        )}
      </Animated.View>

      <Button label={idx === steps.length - 1 ? (loading ? "Création…" : "Créer mon compte") : "Continuer"} icon={idx === steps.length - 1 ? "checkmark" : "arrow-forward"} onPress={loading ? undefined : next} />
      <Text style={[type.small, { textAlign: "center" }]}>
        Déjà membre ?{" "}
        <Text style={styles.link} onPress={() => router.replace("/auth/login")}>
          Se connecter
        </Text>
      </Text>

      <Sheet visible={picker} onClose={() => setPicker(false)} title="Choisir une photo" subtitle="Aperçu démo — la galerie sera branchée en phase native.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {SAMPLE_AVATARS.map((a, i) => (
            <Animated.View key={a} entering={ZoomIn.delay(i * 40).springify()}>
              <Press
                onPress={() => {
                  setAvatar(a);
                  setErr((e) => ({ ...e, avatar: undefined }));
                  setPicker(false);
                }}
                scaleTo={0.9}
                style={[styles.sample, avatar === a && { borderColor: colors.primary }]}
              >
                <Image source={a} style={{ flex: 1 }} contentFit="cover" />
              </Press>
            </Animated.View>
          ))}
        </View>
      </Sheet>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  avatarPick: { width: 116, height: 116, borderRadius: 58, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 3, borderColor: "#fff" },
  avatarPlus: { position: "absolute", bottom: 6, right: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  prefix: { height: 52, minWidth: 70, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  input: { height: 52, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, fontSize: 15, color: colors.ink },
  error: { color: "#E5484D", fontSize: 12, fontWeight: "600" },
  roleCard: { flex: 1, padding: 16, gap: 8, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.line, minHeight: 150 },
  roleOn: { backgroundColor: colors.night, borderColor: colors.night },
  roleIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  netChip: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  netIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  link: { color: colors.primary, fontWeight: "700" },
  sample: { width: 92, height: 92, borderRadius: 46, overflow: "hidden", borderWidth: 3, borderColor: "transparent" },
});
