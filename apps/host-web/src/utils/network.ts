function safeUrl(raw: string, fallback: string): URL {
  try {
    return new URL(raw);
  } catch {
    return new URL(fallback);
  }
}

export function normalizeHostOrigin(raw: string, fallbackOrigin: string): string {
  const value = raw.trim();
  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  const parsed = safeUrl(withScheme, fallbackOrigin);
  return parsed.origin;
}

export function normalizeRelayUrl(raw: string, fallbackUrl: string): string {
  const value = raw.trim();
  const withScheme = /^wss?:\/\//i.test(value)
    ? value
    : /^https?:\/\//i.test(value)
      ? value.replace(/^http/i, "ws")
      : `ws://${value}`;

  const parsed = safeUrl(withScheme, fallbackUrl);
  if (parsed.protocol === "http:") parsed.protocol = "ws:";
  if (parsed.protocol === "https:") parsed.protocol = "wss:";

  return parsed.toString().replace(/\/$/, "");
}

export function splitHostOriginForInput(raw: string, fallbackOrigin: string): { host: string; port: string } {
  const parsed = safeUrl(normalizeHostOrigin(raw, fallbackOrigin), fallbackOrigin);
  const fallback = new URL(fallbackOrigin);

  return {
    host: parsed.hostname,
    port: parsed.port || fallback.port || "80",
  };
}

export function splitRelayUrlForInput(raw: string, fallbackUrl: string): { host: string; port: string } {
  const parsed = safeUrl(normalizeRelayUrl(raw, fallbackUrl), fallbackUrl);

  return {
    host: parsed.hostname,
    port: parsed.port || "8787",
  };
}

export function buildHostOrigin(host: string, port: string): string {
  const normalizedHost = host.trim() || "localhost";
  const normalizedPort = port.trim() || "5173";
  return `http://${normalizedHost}:${normalizedPort}`;
}

export function buildRelayUrl(host: string, port: string): string {
  const normalizedHost = host.trim() || "localhost";
  const normalizedPort = port.trim() || "8787";
  return `ws://${normalizedHost}:${normalizedPort}`;
}
