// Traces de diagnostic (visibles dans le Terminal d'Expo). À retirer une fois le plantage trouvé.
export const dbg = (...a: unknown[]) => {
  if (__DEV__) console.log("[CC]", ...a);
};
