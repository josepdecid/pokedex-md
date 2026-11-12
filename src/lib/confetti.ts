// Confetti for a complete Pokédex, in the type badge colours (--type-<id> in app.css).

/** Three bursts across the screen (fractions of its width and height), a quarter second apart. */
const BURSTS = [
  { x: 0.5, y: 0.55 },
  { x: 0.25, y: 0.4 },
  { x: 0.75, y: 0.35 },
];

/** Throws confetti in the colours of `types`, unless the device asks for reduced motion. */
export async function celebrate(types: readonly string[]): Promise<void> {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const style = getComputedStyle(document.documentElement);
  const color = types.map((type) => style.getPropertyValue(`--type-${type}`).trim()).filter(Boolean);
  // Loaded only when needed: most visits don't celebrate.
  const { default: confetti } = await import('@hiseb/confetti');
  BURSTS.forEach(({ x, y }, i) => {
    const fire = () => confetti({ position: { x: innerWidth * x, y: innerHeight * y }, color, count: 120 });
    setTimeout(fire, i * 250);
  });
}
