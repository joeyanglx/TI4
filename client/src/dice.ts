/** One d10 per die. crypto.getRandomValues works over plain http too, unlike randomUUID. */
export function d10s(count: number): number[] {
  const values = crypto.getRandomValues(new Uint32Array(count));
  return [...values].map((v) => 1 + (v % 10));
}
