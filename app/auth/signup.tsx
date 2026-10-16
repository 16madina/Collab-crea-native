import { Ionicons } from "@expo/vector-icons";
import { pickMedia, uploadFile, type Picked } from "../../src/backend/upload";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  ZoomIn, withTiming } from "react-native-reanimated";
import { AuthShell } from "../../src/components/account/AuthShell";
import {
  ALL_PLATFORMS,
  COLLAB_TYPES,
  CREATOR_CATEGORIES,
  isEmail,
  PLATFORM,
  SECTORS,
} from "../../src/components/account/constants";
import { PasswordField } from "../../src/components/account/PasswordField";
import {
  Checkbox,
  CountrySelect,
  CountrySheet,
  SelectField,
} from "../../src/components/account/widgets";
import { allCountries } from "../../src/countries";
import { phoneError, phoneExample } from "../../src/phone";
import { Chips, Field, Label, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Role, SocialPlatform } from "../../src/types";
import { Button, Press } from "../../src/ui";

type Step = 1 | 2 | 3 | 3.5 | 4;
type Errors = Record<string, string | undefined>;

function Dot({ active, done }: { active: boolean; done: boolean }) {
  const st = useAnimatedStyle(() => ({
    width: withTiming(active ? 28 : 10, { duration: 200 }),
    backgroundColor: active || done ? colors.primary : "#E6DAD2",
    opacity: withTiming(done && !active ? 0.55 : 1, { duration: 200 }),
  }));
  return <Animated.View style={[{ height: 10, borderRadius: 5 }, st]} />;
}

const BRAND_SOCIALS: SocialPlatform[] = ["instagram", "facebook", "tiktok"];

export default function Signup() {
  const params = useLocalSearchParams<{ role?: string; code?: string; terms?: string }>();
  const inviteRequired = useDB((s) => s.inviteRequired);
  const inviteUnlocked = useDB((s) => s.inviteUnlocked);
  const signUp = useDB((s) => s.signUp);
  const updateProfile = useDB((s) => s.updateProfile);

  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState<1 | -1>(1);
  const [err, setErr] = useState<Errors>({});

  // étape 1
  const [avatar, setAvatar] = useState<string>();
  const [avatarFile, setAvatarFile] = useState<Picked | null>(null);
  // Photo de profil : ouvre directement la galerie du téléphone (pas de photos proposées).
  const pickAvatar = async () => {
    try {
      const p = await pickMedia("image", { square: true });
      if (!p) return;
      setAvatarFile(p);
      setAvatar(p.uri);
      setErr((e) => ({ ...e, avatar: undefined }));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  // étape 2
  const [residence, setResidence] = useState<{
    code: string;
    name: string;
    phoneCode: string;
  }>();
  const [origin, setOrigin] = useState<string>();
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [phone, setPhone] = useState("");
  // étape 3
  const [role, setRole] = useState<Role | undefined>(
    params.role === "brand"
      ? "brand"
      : params.role === "creator"
        ? "creator"
        : undefined,
  );
  const [networks, setNetworks] = useState<SocialPlatform[]>([]);
  // étape 3.5
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState<string>();
  const [website, setWebsite] = useState("");
  const [brandSocials, setBrandSocials] = useState<
    Partial<Record<SocialPlatform, string>>
  >({});
  const [collabTypes, setCollabTypes] = useState<string[]>([]);
  const [targetCats, setTargetCats] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  // étape 4
  const [code, setCode] = useState(params.code ?? "");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [terms, setTerms] = useState(params.terms === "1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inviteRequired && !inviteUnlocked)
      router.replace({
        pathname: "/auth/invite",
        params: params.role ? { role: params.role } : {},
      });
  }, [inviteRequired, inviteUnlocked, params.role]);

  const steps: Step[] = useMemo(
    () => (role === "brand" ? [1, 2, 3, 3.5, 4] : [1, 2, 3, 4]),
    [role],
  );
  const idx = steps.indexOf(step);

  const validate = (): Errors => {
    const e: Errors = {};
    if (step === 1) {
      if (!avatar) e.avatar = "La photo de profil est obligatoire";
      if (first.trim().length < 2 || first.trim().length > 50)
        e.first = "Entre 2 et 50 caractères";
      if (last.trim().length < 2 || last.trim().length > 50)
        e.last = "Entre 2 et 50 caractères";
    } else if (step === 2) {
      if (!residence) e.residence = "Sélectionnez votre pays de résidence";
      if (!origin) e.origin = "Sélectionnez votre pays d'origine";
      // Le numéro doit correspondre au pays de résidence (nombre de chiffres, préfixes valides).
      const pe = phoneError(phone, residence?.code, residence?.name);
      if (pe) e.phone = pe;
    } else if (step === 3) {
      if (!role) e.role = "Choisissez votre profil";
      if (role === "creator" && networks.length === 0)
        e.networks = "Sélectionnez au moins un réseau social";
    } else if (step === 3.5) {
      if (company.trim().length < 2 || company.trim().length > 100)
        e.company = "Entre 2 et 100 caractères";
      if (!sector) e.sector = "Choisissez un secteur";
      if (
        website.trim() &&
        !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(normalizedSite())
      )
        e.website = "URL invalide";
      if (!collabTypes.length) e.collabTypes = "Sélectionnez au moins un type";
      if (!targetCats.length)
        e.targetCats = "Sélectionnez au moins une catégorie";
      if (description.trim().length < 10 || description.trim().length > 500)
        e.description = "Entre 10 et 500 caractères";
    } else {
      if (
        inviteRequired &&
        !/^COLLAB-[A-Z0-9]{4}$/.test(code.trim().toUpperCase())
      )
        e.code = "Code d'invitation invalide";
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
    const full_name = `${first.trim()} ${last.trim()}`;
    void signUp({
      email: email.trim().toLowerCase(),
      password: pw,
      followers:
        role === "creator"
          ? Object.fromEntries(networks.map((n) => [n, ""]))
          : undefined,
      inviteCode: inviteRequired ? code.trim().toUpperCase() : undefined,
      role: role!,
      full_name,
      avatar_url: avatarFile ? "" : avatar!,
      country: origin,
      residence_country: residence?.name,
      ...(role === "brand"
        ? {
            company_name: company.trim(),
            sector,
            website: normalizedSite() || undefined,
            company_description: description.trim(),
            logo_url: avatar,
            brand_prefs: {
              collaboration_types: collabTypes,
              target_categories: targetCats,
            },
          }
        : {}),
    }).then((r) => {
      setLoading(false);
      if (!r.ok) return toast(r.error, "error");
      if (useDB.getState().mode === "demo" && role === "creator")
        updateProfile({
          followers: Object.fromEntries(networks.map((n) => [n, ""])),
        });
      if (r.needsConfirmation) {
        toast("Compte créé ! Confirme ton email puis connecte-toi.");
        return router.replace("/auth/login");
      }
      // Photo choisie dans la galerie : envoyée une fois le compte créé.
      if (avatarFile && r.id)
        void uploadFile("avatars", avatarFile, "avatar", r.id)
          .then((url) => updateProfile(role === "brand" ? { avatar_url: url, logo_url: url } : { avatar_url: url }))
          .catch(() => {});
      toast("Compte créé avec succès !");
      router.replace("/(tabs)/home");
    });
  };

  const entering = (dir === 1 ? FadeInRight : FadeInLeft)
    .duration(320)
    .damping(18);
  const titles: Record<string, [string, string]> = {
    "1": ["Faisons connaissance", "Ajoutez une photo et votre nom."],
    "2": [
      "D'où venez-vous ?",
      "Votre pays nous aide à vous proposer des offres adaptées.",
    ],
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
              <Press
                onPress={() => void pickAvatar()}
                style={[
                  styles.avatarPick,
                  !!err.avatar && { borderColor: "#E5484D" },
                ]}
                scaleTo={0.94}
              >
                {avatar ? (
                  <Animated.View
                    entering={ZoomIn.duration(320)}
                    style={StyleSheet.absoluteFill}
                  >
                    <Image
                      source={avatar}
                      style={{ flex: 1 }}
                      contentFit="cover"
                    />
                  </Animated.View>
                ) : (
                  <Ionicons
                    name="camera-outline"
                    size={34}
                    color={colors.primary}
                  />
                )}
              </Press>
              <Text style={[type.small, err.avatar && { color: "#E5484D" }]}>
                {err.avatar ?? "Photo de profil (obligatoire)"}
              </Text>
            </View>
            <Field
              label="Prénom"
              value={first}
              onChangeText={setFirst}
              maxLength={50}
              placeholder="Aïcha"
              error={err.first}
              autoComplete="given-name"
            />
            <Field
              label="Nom"
              value={last}
              onChangeText={setLast}
              maxLength={50}
              placeholder="Koné"
              error={err.last}
              autoComplete="family-name"
            />
          </>
        )}

        {step === 2 && (
          <>
            <CountrySelect
              label="Pays de résidence"
              countries={allCountries}
              value={residence?.name}
              onChange={(c) => setResidence(c)}
              error={err.residence}
            />
            <CountrySelect
              label="Pays d'origine"
              countries={allCountries}
              value={origin}
              onChange={(c) => setOrigin(c.name)}
              error={err.origin}
            />
            <View style={{ gap: 6 }}>
              <Label>Téléphone</Label>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {/* Indicatif : drapeau + code du pays de résidence ; touchable pour choisir le pays. */}
                <Press onPress={() => setPrefixOpen(true)} scaleTo={0.96} style={[styles.prefix, styles.prefixRow]}>
                  <Text style={{ fontSize: 18 }}>
                    {allCountries.find((c) => c.name === residence?.name)?.flag ?? "🌍"}
                  </Text>
                  <Text style={{ fontWeight: "700", color: residence ? colors.ink : colors.muted, fontSize: residence ? 14 : 12 }}>
                    {residence?.phoneCode ?? "Indicatif"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.muted} />
                </Press>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t.replace(/\D/g, "").slice(0, 15));
                    if (err.phone) setErr((e) => ({ ...e, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                  placeholder={phoneExample(residence?.code) ?? "0707070707"}
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.input,
                    { flex: 1 },
                    !!err.phone && { borderColor: "#E5484D" },
                  ]}
                />
              </View>
              {err.phone ? (
                <Text style={styles.error}>{err.phone}</Text>
              ) : (
                <Text style={type.tiny}>
                  {"L'indicatif suit votre pays de résidence."}
                </Text>
              )}
              <CountrySheet
                visible={prefixOpen}
                onClose={() => setPrefixOpen(false)}
                title="Pays de résidence"
                countries={allCountries}
                value={residence?.name}
                onPick={(c) => {
                  setResidence(c);
                  setErr((e) => ({ ...e, residence: undefined }));
                }}
              />
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
                  <Press
                    key={r}
                    onPress={() => setRole(r)}
                    scaleTo={0.96}
                    style={[
                      styles.roleCard,
                      on && styles.roleOn,
                      on && shadow.glow,
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIcon,
                        on && { backgroundColor: "rgba(255,255,255,0.18)" },
                      ]}
                    >
                      <Ionicons
                        name={ic}
                        size={26}
                        color={on ? "#fff" : colors.primary}
                      />
                    </View>
                    <Text style={[type.h3, on && { color: "#fff" }]}>{l}</Text>
                    <Text
                      style={[
                        type.small,
                        on && { color: "rgba(255,255,255,0.8)" },
                      ]}
                    >
                      {d}
                    </Text>
                    {on ? (
                      <Animated.View
                        entering={ZoomIn.duration(320)}
                        style={{ position: "absolute", top: 12, right: 12 }}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary}
                        />
                      </Animated.View>
                    ) : null}
                  </Press>
                );
              })}
            </View>
            {err.role ? <Text style={styles.error}>{err.role}</Text> : null}
            {role === "creator" && (
              <Animated.View
                entering={FadeInDown.duration(320)}
                style={{ gap: 10 }}
              >
                <Label>Vos réseaux sociaux</Label>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {ALL_PLATFORMS.map((p) => {
                    const on = networks.includes(p);
                    return (
                      <Press
                        key={p}
                        onPress={() =>
                          setNetworks(
                            on
                              ? networks.filter((x) => x !== p)
                              : [...networks, p],
                          )
                        }
                        scaleTo={0.94}
                        style={[
                          styles.netChip,
                          on && {
                            backgroundColor: PLATFORM[p].color,
                            borderColor: PLATFORM[p].color,
                          },
                        ]}
                      >
                        <Ionicons
                          name={PLATFORM[p].icon}
                          size={18}
                          color={on ? "#fff" : PLATFORM[p].color}
                        />
                        <Text
                          style={{
                            fontWeight: "700",
                            color: on ? "#fff" : colors.ink,
                          }}
                        >
                          {PLATFORM[p].label}
                        </Text>
                      </Press>
                    );
                  })}
                </View>
                {err.networks ? (
                  <Text style={styles.error}>{err.networks}</Text>
                ) : (
                  <Text style={type.tiny}>
                    Sélectionnez au moins un réseau.
                  </Text>
                )}
              </Animated.View>
            )}
          </>
        )}

        {step === 3.5 && (
          <>
            <Field
              label="Nom de l'entreprise"
              value={company}
              onChangeText={setCompany}
              maxLength={100}
              placeholder="Glow&Care"
              error={err.company}
            />
            <SelectField
              label="Secteur"
              value={sector}
              options={SECTORS}
              onChange={setSector}
              placeholder="Choisir un secteur"
            />
            {err.sector ? (
              <Text style={[styles.error, { marginTop: -10 }]}>
                {err.sector}
              </Text>
            ) : null}
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
              <View
                key={p}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginTop: -6,
                }}
              >
                <View
                  style={[
                    styles.netIcon,
                    { backgroundColor: PLATFORM[p].color },
                  ]}
                >
                  <Ionicons name={PLATFORM[p].icon} size={18} color="#fff" />
                </View>
                <TextInput
                  value={brandSocials[p] ?? ""}
                  onChangeText={(t) =>
                    setBrandSocials({ ...brandSocials, [p]: t })
                  }
                  placeholder={`@${PLATFORM[p].label.toLowerCase()}`}
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
            ))}
            <Label>Types de collaboration</Label>
            <Chips
              options={COLLAB_TYPES}
              value={collabTypes}
              onChange={setCollabTypes}
              multi
            />
            {err.collabTypes ? (
              <Text style={styles.error}>{err.collabTypes}</Text>
            ) : null}
            <Label>Catégories de créateurs recherchées</Label>
            <Chips
              options={CREATOR_CATEGORIES}
              value={targetCats}
              onChange={setTargetCats}
              multi
            />
            {err.targetCats ? (
              <Text style={styles.error}>{err.targetCats}</Text>
            ) : null}
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              placeholder="Présentez votre entreprise, vos valeurs, vos produits…"
              error={err.description}
            />
            <Text style={[type.tiny, { alignSelf: "flex-end", marginTop: -8 }]}>
              {description.length}/500
            </Text>
          </>
        )}

        {step === 4 && (
          <>
            {inviteRequired && (
              <Field
                label="Code d'invitation"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="COLLAB-XXXX"
                error={err.code}
              />
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="vous@exemple.com"
              error={err.email}
            />
            <PasswordField
              label="Mot de passe"
              value={pw}
              onChangeText={setPw}
              error={err.pw}
              placeholder="Minimum 6 caractères"
            />
            <PasswordField
              label="Confirmer le mot de passe"
              value={pw2}
              onChangeText={setPw2}
              error={err.pw2}
              placeholder="••••••"
            />
            <Checkbox value={terms} onChange={setTerms}>
              <Text
                style={[
                  type.small,
                  { color: colors.inkSoft },
                  err.terms && !terms && { color: "#E5484D" },
                ]}
              >
                J'accepte les{" "}
                <Text
                  style={styles.link}
                  onPress={() => router.push("/legal/terms")}
                >
                  Conditions générales d'utilisation
                </Text>{" "}
                et la{" "}
                <Text
                  style={styles.link}
                  onPress={() => router.push("/legal/privacy")}
                >
                  Politique de confidentialité
                </Text>
                .
              </Text>
            </Checkbox>
          </>
        )}
      </Animated.View>

      <Button
        label={
          idx === steps.length - 1
            ? loading
              ? "Création…"
              : "Créer mon compte"
            : "Continuer"
        }
        icon={idx === steps.length - 1 ? "checkmark" : "arrow-forward"}
        onPress={loading ? undefined : next}
      />
      <Text style={[type.small, { textAlign: "center" }]}>
        Déjà membre ?{" "}
        <Text style={styles.link} onPress={() => router.replace("/auth/login")}>
          Se connecter
        </Text>
      </Text>

    </AuthShell>
  );
}

const styles = StyleSheet.create({
  avatarPick: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#fff",
  },
  prefixRow: { flexDirection: "row", gap: 6 },
  prefix: {
    height: 52,
    minWidth: 70,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 13,
    color: colors.ink,
  },
  error: { color: "#E5484D", fontSize: 11, fontWeight: "600" },
  roleCard: {
    flex: 1,
    padding: 16,
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
    minHeight: 150,
  },
  roleOn: { backgroundColor: colors.night, borderColor: colors.night },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  netChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  netIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { color: colors.primary, fontWeight: "700" },
  sample: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "transparent",
  },
});
