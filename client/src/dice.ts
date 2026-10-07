/** `count` dice with `sides` faces. crypto.getRandomValues works over plain http too, unlike randomUUID. */
export function rollDice(sides: number, count: number): number[] {
  const values = crypto.getRandomValues(new Uint32Array(count));
  return [...values].map((v) => 1 + (v % sides));
}

export function d10s(count: number): number[] {
  return rollDice(10, count);
}
