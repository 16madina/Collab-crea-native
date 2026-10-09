import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Card, Empty, Screen } from "../../src/kit";
import { useDB } from "../../src/store";
import { colors, type } from "../../src/theme";

/** Rend un markdown minimal : titres ##/###, listes "- ", paragraphes, **gras**. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={type.body}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} style={{ fontWeight: "800", color: colors.ink }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export default function Legal() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const legalPages = useDB((s) => s.legalPages);
  const page = useMemo(() => legalPages.find((p) => p.slug === slug), [legalPages, slug]);

  const blocks = useMemo(() => {
    if (!page) return [];
    return page.content
      .split(/\n{2,}/)
      .flatMap((b) => {
        const lines = b.split("\n");
        const out: { kind: "h2" | "h3" | "p" | "li"; text: string }[] = [];
        let para: string[] = [];
        const flush = () => {
          if (para.length) out.push({ kind: "p", text: para.join(" ") });
          para = [];
        };
        lines.forEach((l) => {
          const t = l.trim();
          if (!t) return;
          if (t.startsWith("### ")) (flush(), out.push({ kind: "h3", text: t.slice(4) }));
          else if (t.startsWith("## ")) (flush(), out.push({ kind: "h2", text: t.slice(3) }));
          else if (t.startsWith("# ")) (flush(), out.push({ kind: "h2", text: t.slice(2) }));
          else if (/^[-*] /.test(t)) (flush(), out.push({ kind: "li", text: t.slice(2) }));
          else para.push(t);
        });
        flush();
        return out;
      });
  }, [page]);

  if (!page)
    return (
      <Screen title="Page introuvable">
        <Empty icon="document-outline" title="Cette page n'existe pas" />
      </Screen>
    );

  return (
    <Screen title={page.title}>
      <Animated.View entering={FadeInDown.springify()}>
        <Card style={{ gap: 12, padding: 20 }}>
          <Text style={type.h1}>{page.title}</Text>
          {blocks.map((b, i) =>
            b.kind === "h2" ? (
              <Text key={i} style={[type.h2, { marginTop: 8 }]}>
                {b.text}
              </Text>
            ) : b.kind === "h3" ? (
              <Text key={i} style={[type.h3, { marginTop: 4 }]}>
                {b.text}
              </Text>
            ) : b.kind === "li" ? (
              <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: "800" }}>•</Text>
                <View style={{ flex: 1 }}>
                  <Inline text={b.text} />
                </View>
              </View>
            ) : (
              <Inline key={i} text={b.text} />
            ),
          )}
        </Card>
      </Animated.View>
    </Screen>
  );
}
