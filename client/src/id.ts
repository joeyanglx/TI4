// crypto.randomUUID only exists on https/localhost; friends joining over a LAN IP use plain http.
export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
