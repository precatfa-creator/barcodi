// Generate a strong, readable password. Avoids ambiguous characters (O/0, l/1)
// and always includes at least one lowercase, uppercase, digit and symbol.
export function generateStrongPassword(length = 16): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_=+';
  const all = lower + upper + digits + symbols;

  const pick = (set: string) => set[Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * set.length)];

  const required = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pick(all));
  const chars = [...required, ...rest];

  // Fisher–Yates shuffle so the required chars aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
