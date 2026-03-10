import { useSettingsStore } from "../features/actions/useSettingsStore";
import { buildHostOrigin, buildRelayUrl, normalizeHostOrigin, normalizeRelayUrl, splitHostOriginForInput, splitRelayUrlForInput } from "../utils/network";

export function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings);
  const patchSettings = useSettingsStore((state) => state.patchSettings);
  const fallbackHostOrigin = window.location.origin;
  const publicHostOrigin = normalizeHostOrigin(settings.publicHostOrigin?.trim() || fallbackHostOrigin, fallbackHostOrigin);
  const relayUrl = normalizeRelayUrl(settings.relayUrl, "ws://localhost:8787");
  const publicRelayUrl = normalizeRelayUrl(settings.publicRelayUrl?.trim() || relayUrl, relayUrl);

  const hostEndpoint = splitHostOriginForInput(publicHostOrigin, fallbackHostOrigin);
  const relayEndpoint = splitRelayUrlForInput(publicRelayUrl, relayUrl);

  function patchCompanionNetwork(next: Partial<{ host: string; hostPort: string; relayPort: string }>) {
    const host = next.host ?? hostEndpoint.host;
    const hostPort = next.hostPort ?? hostEndpoint.port;
    const relayPort = next.relayPort ?? relayEndpoint.port;

    patchSettings({
      publicHostOrigin: buildHostOrigin(host, hostPort),
      publicRelayUrl: buildRelayUrl(host, relayPort),
      relayUrl: buildRelayUrl(host, relayPort),
    });
  }

  return (
    <div className="stack">
      <section className="card stack">
        <strong>Settings</strong>
        <div className="small">Companion network setup uses IP + ports only (do not include protocol).</div>
        <label className="stack">
          PC IP Address
          <input
            value={hostEndpoint.host}
            onChange={(event) => patchCompanionNetwork({ host: event.target.value })}
            placeholder="192.168.1.10"
          />
        </label>
        <label className="stack">
          Host Web Port
          <input
            value={hostEndpoint.port}
            onChange={(event) => patchCompanionNetwork({ hostPort: event.target.value })}
            placeholder="5173"
          />
        </label>
        <label className="stack">
          Relay Port
          <input
            value={relayEndpoint.port}
            onChange={(event) => patchCompanionNetwork({ relayPort: event.target.value })}
            placeholder="8787"
          />
        </label>
        <div className="small">Generated host URL: {publicHostOrigin}</div>
        <div className="small">Generated relay URL: {publicRelayUrl}</div>
        <label className="stack">
          VTS Host
          <input value={settings.vtsHost} onChange={(event) => patchSettings({ vtsHost: event.target.value })} />
        </label>
        <label className="stack">
          VTS Port
          <input
            value={settings.vtsPort}
            onChange={(event) => patchSettings({ vtsPort: Number(event.target.value) || 8001 })}
          />
        </label>
      </section>
      <section className="card">
        <div className="small">Changes are persisted automatically in IndexedDB.</div>
      </section>
    </div>
  );
}
