export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function createPairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
