/** Alterne vrais créateurs et profils de démonstration (vrais d'abord, ceux avec photo en priorité). */
export function mixRealDemo<
  T extends { is_demo?: boolean; avatar_url?: unknown },
>(list: T[]): T[] {
  const real = list
    .filter((p) => !p.is_demo)
    .sort((a, b) => Number(!!b.avatar_url) - Number(!!a.avatar_url));
  const demo = list.filter((p) => p.is_demo);
  const out: T[] = [];
  for (let i = 0; i < Math.max(real.length, demo.length); i++) {
    if (real[i]) out.push(real[i]);
    if (demo[i]) out.push(demo[i]);
  }
  return out;
}
