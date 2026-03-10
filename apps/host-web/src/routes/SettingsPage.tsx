import { useEffect, useMemo, useState } from "react";
import type { Settings } from "@vpad/shared-types";
import { useSettingsStore } from "../features/actions/useSettingsStore";
import { loadSnapshot, saveSnapshot } from "../storage/repository";
import { buildHostOrigin, buildRelayUrl, normalizeHostOrigin, normalizeRelayUrl, splitHostOriginForInput, splitRelayUrlForInput } from "../utils/network";
import { nowIso } from "../utils/time";

type SettingsDraft = {
  host: string;
  hostPort: string;
  relayPort: string;
  vtsHost: string;
  vtsPort: string;
  devMockVts: boolean;
};

type NormalizedSettingsSnapshot = {
  publicHostOrigin: string;
  relayUrl: string;
  publicRelayUrl: string;
  vtsHost: string;
  vtsPort: number;
  devMockVts: boolean;
};

function draftFromSettings(settings: Settings, fallbackHostOrigin: string): SettingsDraft {
  const publicHostOrigin = normalizeHostOrigin(settings.publicHostOrigin?.trim() || fallbackHostOrigin, fallbackHostOrigin);
  const relayUrl = normalizeRelayUrl(settings.relayUrl, "ws://localhost:8787");
  const publicRelayUrl = normalizeRelayUrl(settings.publicRelayUrl?.trim() || relayUrl, relayUrl);
  const hostEndpoint = splitHostOriginForInput(publicHostOrigin, fallbackHostOrigin);
  const relayEndpoint = splitRelayUrlForInput(publicRelayUrl, relayUrl);

  return {
    host: hostEndpoint.host,
    hostPort: hostEndpoint.port,
    relayPort: relayEndpoint.port,
    vtsHost: settings.vtsHost,
    vtsPort: String(settings.vtsPort),
    devMockVts: Boolean(settings.devMockVts),
  };
}

function normalizeDraft(draft: SettingsDraft, fallbackHostOrigin: string): NormalizedSettingsSnapshot {
  const nextHostOrigin = normalizeHostOrigin(buildHostOrigin(draft.host, draft.hostPort), fallbackHostOrigin);
  const nextRelayUrl = normalizeRelayUrl(buildRelayUrl(draft.host, draft.relayPort), "ws://localhost:8787");

  return {
    publicHostOrigin: nextHostOrigin,
    relayUrl: nextRelayUrl,
    publicRelayUrl: normalizeRelayUrl(nextRelayUrl, nextRelayUrl),
    vtsHost: draft.vtsHost.trim() || "localhost",
    vtsPort: Number(draft.vtsPort) || 8001,
    devMockVts: Boolean(draft.devMockVts),
  };
}

function normalizeSettings(settings: Settings, fallbackHostOrigin: string): NormalizedSettingsSnapshot {
  const publicHostOrigin = normalizeHostOrigin(settings.publicHostOrigin?.trim() || fallbackHostOrigin, fallbackHostOrigin);
  const relayUrl = normalizeRelayUrl(settings.relayUrl, "ws://localhost:8787");
  const publicRelayUrl = normalizeRelayUrl(settings.publicRelayUrl?.trim() || relayUrl, relayUrl);

  return {
    publicHostOrigin,
    relayUrl,
    publicRelayUrl,
    vtsHost: settings.vtsHost,
    vtsPort: settings.vtsPort,
    devMockVts: Boolean(settings.devMockVts),
  };
}

export function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const fallbackHostOrigin = window.location.origin;
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFromSettings(settings, fallbackHostOrigin));
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>();

  const normalizedDraft = useMemo(() => normalizeDraft(draft, fallbackHostOrigin), [draft, fallbackHostOrigin]);
  const normalizedSettings = useMemo(() => normalizeSettings(settings, fallbackHostOrigin), [settings, fallbackHostOrigin]);

  const hasUnsavedChanges =
    normalizedDraft.publicHostOrigin !== normalizedSettings.publicHostOrigin ||
    normalizedDraft.publicRelayUrl !== normalizedSettings.publicRelayUrl ||
    normalizedDraft.relayUrl !== normalizedSettings.relayUrl ||
    normalizedDraft.vtsHost !== normalizedSettings.vtsHost ||
    normalizedDraft.vtsPort !== normalizedSettings.vtsPort ||
    normalizedDraft.devMockVts !== normalizedSettings.devMockVts;

  useEffect(() => {
    if (hasUnsavedChanges) return;
    setDraft(draftFromSettings(settings, fallbackHostOrigin));
  }, [fallbackHostOrigin, hasUnsavedChanges, settings]);

  function patchCompanionNetwork(next: Partial<{ host: string; hostPort: string; relayPort: string }>) {
    setDraft((state) => ({
      ...state,
      host: next.host ?? state.host,
      hostPort: next.hostPort ?? state.hostPort,
      relayPort: next.relayPort ?? state.relayPort,
    }));
  }

  function cancelChanges() {
    setDraft(draftFromSettings(settings, fallbackHostOrigin));
    setSaveMessage(undefined);
  }

  async function saveChanges() {
    const nextSettings: Settings = {
      ...settings,
      publicHostOrigin: normalizedDraft.publicHostOrigin,
      publicRelayUrl: normalizedDraft.publicRelayUrl,
      relayUrl: normalizedDraft.relayUrl,
      vtsHost: normalizedDraft.vtsHost,
      vtsPort: normalizedDraft.vtsPort,
      devMockVts: normalizedDraft.devMockVts,
      updatedAt: nowIso(),
    };

    setSaving(true);
    setSaveMessage(undefined);

    try {
      setSettings(nextSettings);
      const snapshot = await loadSnapshot();
      await saveSnapshot({ ...snapshot, settings: nextSettings });
      setSaveMessage("Settings saved.");
    } catch {
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack settings-page">
      <section className="card stack settings-card">
        <strong>Settings</strong>
        <div className="small">Companion network setup uses IP + ports only (no protocol).</div>
        <div className="settings-grid">
          <label className="stack">
            <span className="small">PC IP Address</span>
            <input
              value={draft.host}
              onChange={(event) => patchCompanionNetwork({ host: event.target.value })}
              placeholder="192.168.1.10"
            />
          </label>
          <label className="stack">
            <span className="small">Host Web Port</span>
            <input
              value={draft.hostPort}
              onChange={(event) => patchCompanionNetwork({ hostPort: event.target.value })}
              placeholder="5173"
              inputMode="numeric"
            />
          </label>
          <label className="stack">
            <span className="small">Relay Port</span>
            <input
              value={draft.relayPort}
              onChange={(event) => patchCompanionNetwork({ relayPort: event.target.value })}
              placeholder="8787"
              inputMode="numeric"
            />
          </label>
        </div>
        <div className="small">Generated host URL: {normalizedDraft.publicHostOrigin}</div>
        <div className="small">Generated relay URL: {normalizedDraft.publicRelayUrl}</div>
        <div className="settings-grid">
          <label className="stack">
            <span className="small">VTS Host</span>
            <input
              value={draft.vtsHost}
              onChange={(event) => setDraft((state) => ({ ...state, vtsHost: event.target.value }))}
              disabled={import.meta.env.DEV && draft.devMockVts}
            />
          </label>
          <label className="stack">
            <span className="small">VTS Port</span>
            <input
              value={draft.vtsPort}
              onChange={(event) => setDraft((state) => ({ ...state, vtsPort: event.target.value }))}
              inputMode="numeric"
              disabled={import.meta.env.DEV && draft.devMockVts}
            />
          </label>
        </div>
        {import.meta.env.DEV ? (
          <>
            <label className="row modal-checkbox">
              <input
                type="checkbox"
                checked={draft.devMockVts}
                onChange={(event) => setDraft((state) => ({ ...state, devMockVts: event.target.checked }))}
              />
              Mock VTS in development mode
            </label>
            <div className="small">Use this when you want to work on UI/flow without opening VTube Studio.</div>
          </>
        ) : null}
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="small">
            {saveMessage ? saveMessage : hasUnsavedChanges ? "You have unsaved changes." : "No unsaved changes."}
          </span>
          <div className="row">
            <button type="button" onClick={cancelChanges} disabled={!hasUnsavedChanges || saving}>
              Cancel
            </button>
            <button className="primary" type="button" onClick={() => void saveChanges()} disabled={!hasUnsavedChanges || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </section>
      <section className="card settings-card">
        <div className="small">Changes are saved to IndexedDB only after you click `Save Changes`.</div>
      </section>
    </div>
  );
}
