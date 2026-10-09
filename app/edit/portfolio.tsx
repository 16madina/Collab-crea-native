import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Alert, Dimensions, Modal, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SAMPLE_MEDIA } from "../../src/components/account/constants";
import { Sheet } from "../../src/components/account/Sheet";
import { Chips, Empty, Field, Label, Screen, Segmented, toast } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, radius, type } from "../../src/theme";
import { PortfolioItem } from "../../src/types";
import { Button, IconButton, Press } from "../../src/ui";

const W = Dimensions.get("window").width;
const TILE = (W - 40 - 10) / 2;
type Filter = "all" | "image" | "video";

const confirm = (title: string, msg: string, ok: () => void) => {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (globalThis.confirm?.(`${title}\n${msg}`)) ok();
    return;
  }
  Alert.alert(title, msg, [
    { text: "Annuler", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: ok },
  ]);
};

export default function EditPortfolio() {
  const userId = useDB((s) => s.userId);
  const portfolio = useDB((s) => s.portfolio);
  const addPortfolio = useDB((s) => s.addPortfolio);
  const removePortfolio = useDB((s) => s.removePortfolio);
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  // formulaire
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [media, setMedia] = useState<string>();

  const mine = useMemo(() => portfolio.filter((p) => p.user_id === userId), [portfolio, userId]);
  const list = useMemo(() => (filter === "all" ? mine : mine.filter((p) => p.media_type === filter)), [mine, filter]);
  const current: PortfolioItem | undefined = viewer != null ? list[viewer] : undefined;

  const add = () => {
    if (!title.trim()) return toast("Le titre est requis", "error");
    if (!media) return toast("Choisissez un média", "error");
    addPortfolio({ title: title.trim(), description: desc.trim() || undefined, platform, media_type: mediaType, media_url: media, views_count: 0 });
    toast("Contenu ajouté au portfolio");
    setAdding(false);
    setTitle("");
    setDesc("");
    setMedia(undefined);
  };

  const del = (p: PortfolioItem) =>
    confirm("Supprimer ce contenu ?", p.title, () => {
      removePortfolio(p.id);
      setViewer(null);
      toast("Contenu supprimé");
    });

  return (
    <Screen title="Mon portfolio" subtitle={`${mine.length} contenu${mine.length > 1 ? "s" : ""}`} right={<IconButton name="add" onPress={() => setAdding(true)} />}>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tous" },
          { value: "image", label: "Photos" },
          { value: "video", label: "Vidéos" },
        ]}
      />
      {list.length === 0 ? (
        <Empty icon="images-outline" title="Rien ici pour l'instant" text="Ajoutez vos meilleures créations pour convaincre les marques." action={<Button label="Ajouter" small icon="add" onPress={() => setAdding(true)} />} />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {list.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 40).springify()} exiting={FadeOut} layout={LinearTransition.springify()}>
              <Press onPress={() => setViewer(i)} onLongPress={() => del(p)} style={{ width: TILE, height: TILE * 1.25, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.line }} scaleTo={0.97}>
                <Image source={p.media_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                <View style={styles.tileFoot}>
                  <Text style={{ color: "#fff", fontWeight: "700" }} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                    {p.platform ?? ""}
                    {p.views_count ? ` · ${p.views_count.toLocaleString("fr-FR")} vues` : ""}
                  </Text>
                </View>
                {p.media_type === "video" ? (
                  <View style={styles.play}>
                    <Ionicons name="play" size={14} color="#fff" />
                  </View>
                ) : null}
                <Press onPress={() => del(p)} style={styles.trash} scaleTo={0.85}>
                  <Ionicons name="trash-outline" size={14} color="#fff" />
                </Press>
              </Press>
            </Animated.View>
          ))}
        </View>
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Ajouter un contenu" footer={<Button label="Ajouter au portfolio" icon="add" onPress={add} />}>
        <Label>Média</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SAMPLE_MEDIA.map((m) => (
            <Press key={m} onPress={() => setMedia(m)} scaleTo={0.92} style={[styles.pick, media === m && { borderColor: colors.primary }]}>
              <Image source={m} style={{ flex: 1 }} contentFit="cover" />
              {media === m ? (
                <Animated.View entering={ZoomIn} style={styles.pickCheck}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </Animated.View>
              ) : null}
            </Press>
          ))}
        </View>
        <Text style={type.tiny}>Sélection démo — l'import depuis la galerie arrivera avec la version native.</Text>
        <Field label="Titre *" value={title} onChangeText={setTitle} maxLength={100} placeholder="Routine beauté du matin" />
        <Field label="Description" value={desc} onChangeText={setDesc} multiline maxLength={500} placeholder="Contexte, résultats…" />
        <Label>Plateforme</Label>
        <Chips options={["Instagram", "TikTok", "YouTube", "Snapchat", "Facebook"]} value={platform} onChange={setPlatform} />
        <Label>Type</Label>
        <Segmented
          value={mediaType}
          onChange={setMediaType}
          options={[
            { value: "image", label: "Image" },
            { value: "video", label: "Vidéo" },
          ]}
        />
      </Sheet>

      <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
          {current ? (
            <Animated.View key={current.id} entering={FadeIn.duration(220)} style={{ flex: 1 }}>
              <Image source={current.media_url} style={{ flex: 1 }} contentFit="contain" />
            </Animated.View>
          ) : null}
          <View style={[styles.viewerTop, { top: insets.top + 8 }]}>
            <IconButton name="close" dark onPress={() => setViewer(null)} />
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {(viewer ?? 0) + 1} / {list.length}
            </Text>
            {current ? <IconButton name="trash-outline" dark onPress={() => del(current)} /> : <View />}
          </View>
          {current ? (
            <View style={[styles.viewerFoot, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{current.title}</Text>
              {current.description ? <Text style={{ color: "rgba(255,255,255,0.8)" }}>{current.description}</Text> : null}
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                {current.platform} · {current.media_type === "video" ? "Vidéo" : "Image"}
              </Text>
            </View>
          ) : null}
          {viewer != null && viewer > 0 ? (
            <Press onPress={() => setViewer(viewer - 1)} style={[styles.nav, { left: 12 }]}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </Press>
          ) : null}
          {viewer != null && viewer < list.length - 1 ? (
            <Press onPress={() => setViewer(viewer + 1)} style={[styles.nav, { right: 12 }]}>
              <Ionicons name="chevron-forward" size={26} color="#fff" />
            </Press>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tileFoot: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: "rgba(0,0,0,0.35)" },
  play: { position: "absolute", top: 10, left: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  trash: { position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(197,48,48,0.85)", alignItems: "center", justifyContent: "center" },
  pick: { width: 96, height: 96, borderRadius: radius.md, overflow: "hidden", borderWidth: 3, borderColor: "transparent" },
  pickCheck: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  viewerTop: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewerFoot: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, gap: 4, backgroundColor: "rgba(0,0,0,0.5)" },
  nav: { position: "absolute", top: "50%", marginTop: -26, width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
});
