import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { type AnyRelayToClientMessage, type PadSnapshot } from "@vpad/shared-protocol";
import type { TriggerAction, TriggerPad } from "@vpad/shared-types";
import { useAppBootstrap } from "../app/useAppBootstrap";
import { executePadAction, HostSoundPlayer } from "../features/actions/actionExecutor";
import { useSettingsStore } from "../features/actions/useSettingsStore";
import { useProfileStore } from "../features/profiles/useProfileStore";
import { RelayClient } from "../features/remote/relayClient";
import { useRemoteStore } from "../features/remote/useRemoteStore";
import { useSoundboardStore } from "../features/soundboard/useSoundboardStore";
import { useVtsStore } from "../features/vts/useVtsStore";
import { WebSocketVtsClient } from "../features/vts/vtsClient";
import { loadSnapshot, parseImport, saveSnapshot, serializeExport } from "../storage/repository";
import { buildHostOrigin, buildRelayUrl, normalizeHostOrigin, normalizeRelayUrl, splitHostOriginForInput, splitRelayUrlForInput } from "../utils/network";
import { nowIso } from "../utils/time";

export function HostPage() {
  const { loaded } = useAppBootstrap();

  const [pluginName, setPluginName] = useState("VPad");
  const [pluginDeveloper, setPluginDeveloper] = useState("VPad");
  const [qrDataUrl, setQrDataUrl] = useState<string>();
  const [importError, setImportError] = useState<string>();
  const [padModalState, setPadModalState] = useState<
    | { mode: "create"; defaultPageId: string }
    | { mode: "edit"; padId: string }
    | null
  >(null);

  const vts = useMemo(() => new WebSocketVtsClient(), []);
  const relay = useMemo(() => new RelayClient(), []);
  const soundPlayer = useMemo(() => new HostSoundPlayer(), []);

  const settings = useSettingsStore((state) => state.settings);
  const setSettings = useSettingsStore((state) => state.patchSettings);

  const profileId = useProfileStore((state) => state.activeProfileId);
  const pages = useSoundboardStore((state) => state.pages);
  const pads = useSoundboardStore((state) => state.pads);
  const activePageId = useSoundboardStore((state) => state.activePageId);
  const addPad = useSoundboardStore((state) => state.addPad);
  const updatePad = useSoundboardStore((state) => state.updatePad);
  const deletePad = useSoundboardStore((state) => state.deletePad);
  const setActivePage = useSoundboardStore((state) => state.setActivePage);

  const setVtsStatus = useVtsStore((state) => state.setStatus);
  const setVtsError = useVtsStore((state) => state.setError);
  const setHotkeys = useVtsStore((state) => state.setHotkeys);
  const hotkeys = useVtsStore((state) => state.hotkeys);
  const vtsError = useVtsStore((state) => state.lastError);

  const pairing = useRemoteStore((state) => state.pairing);
  const setPairing = useRemoteStore((state) => state.setPairing);
  const setConnectedDeviceCount = useRemoteStore((state) => state.setConnectedDeviceCount);
  const connectedDeviceCount = useRemoteStore((state) => state.connectedDeviceCount);

  const visiblePads = pads
    .filter((pad) => pad.pageId === activePageId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const editingPad = padModalState?.mode === "edit" ? pads.find((item) => item.id === padModalState.padId) : undefined;
  const fallbackHostOrigin = window.location.origin;
  const publicHostOrigin = normalizeHostOrigin(settings.publicHostOrigin?.trim() || fallbackHostOrigin, fallbackHostOrigin);
  const relayUrl = normalizeRelayUrl(settings.relayUrl, "ws://localhost:8787");
  const publicRelayUrl = derivePublicRelayUrl(relayUrl, settings.publicRelayUrl, publicHostOrigin);
  const hostEndpoint = splitHostOriginForInput(publicHostOrigin, fallbackHostOrigin);
  const relayEndpoint = splitRelayUrlForInput(publicRelayUrl, relayUrl);
  const remoteJoinUrl = pairing
    ? buildRemoteJoinUrl(publicHostOrigin, pairing.sessionId, pairing.pairingToken, publicRelayUrl)
    : undefined;

  useEffect(() => {
    if (!remoteJoinUrl) return;

    void QRCode.toDataURL(remoteJoinUrl, { margin: 1, width: 220 }).then(setQrDataUrl).catch(() => setQrDataUrl(undefined));
  }, [remoteJoinUrl]);

  const executePad = useCallback(
    async (pad: TriggerPad) => {
      try {
        await executePadAction(
          pad,
          {
            vtsClient: vts,
            soundsById: {},
          },
          soundPlayer,
        );
      } catch (error) {
        setVtsError(error instanceof Error ? error.message : "Action execution failed");
      }
    },
    [setVtsError, soundPlayer, vts],
  );

  const handleRelayMessage = useCallback(
    (message: AnyRelayToClientMessage) => {
      switch (message.type) {
        case "session:created": {
          setPairing({
            sessionId: message.payload.sessionId,
            pairingToken: message.payload.pairingToken,
            pairingCode: message.payload.pairingCode,
            pairingExpiresAt: message.payload.pairingExpiresAt,
            sessionExpiresAt: message.payload.sessionExpiresAt,
          });
          break;
        }
        case "remote:joined": {
          setConnectedDeviceCount(message.payload.connectedDeviceCount);
          break;
        }
        case "remote:left": {
          setConnectedDeviceCount(message.payload.connectedDeviceCount);
          break;
        }
        case "remote:event": {
          const pad = pads.find((item) => item.id === message.payload.padId);
          if (!pad || !pad.enabled) return;
          void executePad(pad);
          break;
        }
        case "session:revoked": {
          setPairing(undefined);
          setConnectedDeviceCount(0);
          break;
        }
        case "session:error": {
          setVtsError(message.payload.message);
          break;
        }
        case "layout:updated":
        case "pong":
          break;
      }
    },
    [executePad, pads, setConnectedDeviceCount, setPairing, setVtsError],
  );

  useEffect(() => {
    if (!loaded) return;

    const unsub = relay.onMessage((message: AnyRelayToClientMessage) => {
      handleRelayMessage(message);
    });

    return () => {
      unsub();
      relay.disconnect();
    };
  }, [handleRelayMessage, loaded, relay]);

  useEffect(() => {
    if (!pairing) return;
    relay.updateLayout({
      sessionId: pairing.sessionId,
      layout: toPadSnapshot(pads),
    });
  }, [pads, pairing, relay]);

  async function connectVts() {
    setVtsStatus("connecting");
    setVtsError(undefined);

    try {
      await vts.connect(settings.vtsHost, settings.vtsPort);
      setVtsStatus("connected");

      if (settings.vtsToken) {
        const restored = await vts.restoreToken(settings.vtsToken);
        if (!restored) {
          setVtsError("Stored token is invalid. Re-authenticate.");
          return;
        }
      }

      const keys = await vts.listHotkeys();
      setHotkeys(keys);
    } catch (error) {
      setVtsStatus("error");
      setVtsError(error instanceof Error ? error.message : "Unknown connection error");
    }
  }

  async function authenticateVts() {
    try {
      await vts.authenticate(pluginName, pluginDeveloper);
      const token = vts.getToken();
      if (token) {
        setSettings({ vtsToken: token });
      }
      const keys = await vts.listHotkeys();
      setHotkeys(keys);
      setVtsStatus("connected");
      setVtsError(undefined);
    } catch (error) {
      setVtsStatus("error");
      setVtsError(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  function openCreatePadModal() {
    if (!activePageId) return;
    setPadModalState({ mode: "create", defaultPageId: activePageId });
  }

  function openEditPadModal(padId: string) {
    setPadModalState({ mode: "edit", padId });
  }

  function onDeletePadFromMenu(padId: string) {
    deletePad(padId);
    if (padModalState?.mode === "edit" && padModalState.padId === padId) {
      setPadModalState(null);
    }
  }

  function onSubmitPadForm(draft: PadFormDraft) {
    if (!profileId) return;

    if (padModalState?.mode === "create") {
      const created = addPad({
        profileId,
        pageId: draft.pageId,
        label: draft.label || "Untitled Pad",
      });

      updatePad({
        ...created,
        pageId: draft.pageId,
        label: draft.label || "Untitled Pad",
        color: draft.color || "#d9e2ec",
        mode: draft.mode,
        enabled: draft.enabled,
        action: padActionFromDraft(draft),
        updatedAt: nowIso(),
      });
      setPadModalState(null);
      return;
    }

    if (padModalState?.mode === "edit") {
      const existing = pads.find((item) => item.id === padModalState.padId);
      if (!existing) return;

      updatePad({
        ...existing,
        pageId: draft.pageId,
        label: draft.label || existing.label,
        color: draft.color || "#d9e2ec",
        mode: draft.mode,
        enabled: draft.enabled,
        action: padActionFromDraft(draft),
        updatedAt: nowIso(),
      });
      setPadModalState(null);
    }
  }

  async function enableCompanionMode() {
    await relay.connect(relayUrl);
    relay.createSession({ layout: toPadSnapshot(pads) });
  }

  function patchCompanionNetwork(next: Partial<{ host: string; hostPort: string; relayPort: string }>) {
    const host = next.host ?? hostEndpoint.host;
    const hostPort = next.hostPort ?? hostEndpoint.port;
    const relayPort = next.relayPort ?? relayEndpoint.port;

    const nextHostOrigin = buildHostOrigin(host, hostPort);
    const nextRelayUrl = buildRelayUrl(host, relayPort);

    setSettings({
      publicHostOrigin: nextHostOrigin,
      publicRelayUrl: nextRelayUrl,
      relayUrl: nextRelayUrl,
    });
  }

  function revokeSession() {
    if (!pairing) return;
    relay.revokeSession(pairing.sessionId);
    setPairing(undefined);
    setConnectedDeviceCount(0);
  }

  async function onExport() {
    const snapshot = await loadSnapshot();
    const exported = serializeExport(snapshot);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "vpad-config.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File) {
    try {
      setImportError(undefined);
      const text = await file.text();
      const parsed = parseImport(text);

      await saveSnapshot({
        profiles: parsed.profiles,
        pages: parsed.pages,
        pads: parsed.pads,
        sounds: parsed.sounds,
        settings: parsed.settings,
      });

      window.location.reload();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
    }
  }

  const padModalDraft = useMemo(() => {
    if (padModalState?.mode === "create") {
      return createPadDraft({
        pageId: padModalState.defaultPageId,
      });
    }

    if (editingPad) {
      return draftFromPad(editingPad);
    }

    return undefined;
  }, [editingPad, padModalState]);

  if (!loaded) {
    return <div className="card">Loading workspace...</div>;
  }

  return (
    <div className="stack">
      <section className="card stack">
        <strong>VTube Studio</strong>
        <div className="row">
          <input
            value={settings.vtsHost}
            onChange={(event) => setSettings({ vtsHost: event.target.value })}
            placeholder="VTS host"
          />
          <input
            value={settings.vtsPort}
            onChange={(event) => setSettings({ vtsPort: Number(event.target.value) || 8001 })}
            placeholder="VTS port"
          />
          <button className="primary" onClick={connectVts}>
            Connect
          </button>
        </div>
        <div className="row">
          <input value={pluginName} onChange={(event) => setPluginName(event.target.value)} placeholder="Plugin name" />
          <input
            value={pluginDeveloper}
            onChange={(event) => setPluginDeveloper(event.target.value)}
            placeholder="Plugin developer"
          />
          <button onClick={authenticateVts}>Authenticate</button>
        </div>
        {vtsError ? <div className="small">Error: {vtsError}</div> : null}
      </section>

      <section className="card stack soundboard-card">
        <div className="row soundboard-toolbar">
          <div className="stack">
            <strong>Soundboard</strong>
            <span className="small">Tap to trigger. Use the top-right menu to edit or delete each button.</span>
          </div>
          <button className="primary" onClick={openCreatePadModal} disabled={!profileId || !activePageId}>
            Add Soundboard Button
          </button>
        </div>
        <div className="row soundboard-controls">
          <span className="small">Active Page</span>
          <select value={activePageId} onChange={(event) => setActivePage(event.target.value)}>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid">
          {visiblePads.map((pad) => (
            <div key={pad.id} className="pad-item">
              <button className="pad" style={{ background: pad.color ?? "#d9e2ec" }} onClick={() => void executePad(pad)}>
                <span className="pad-label">{pad.label}</span>
                <span className="pad-meta">{formatActionType(pad.action.type)}</span>
              </button>
              <div className="pad-actions" role="menu" aria-label={`Actions for ${pad.label}`}>
                <button className="pad-actions-trigger" type="button" aria-label={`Open menu for ${pad.label}`}>
                  ⋯
                </button>
                <div className="pad-actions-menu">
                  <button type="button" className="pad-menu-item" onClick={() => openEditPadModal(pad.id)}>
                    Edit
                  </button>
                  <button type="button" className="pad-menu-item danger" onClick={() => onDeletePadFromMenu(pad.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {visiblePads.length === 0 ? <div className="small">No pads on this page yet.</div> : null}
      </section>

      <section className="card stack">
        <strong>Companion Mode</strong>
        <div className="small">Fill only IP and ports (no `http://` or `ws://`).</div>
        <div className="small">Example: IP `192.168.9.71`, Host Port `5173`, Relay Port `8787`.</div>
        <div className="row">
          <label className="stack" style={{ minWidth: 220 }}>
            <span className="small">PC IP Address</span>
            <input
              value={hostEndpoint.host}
              onChange={(event) => patchCompanionNetwork({ host: event.target.value })}
              placeholder="192.168.9.71"
            />
          </label>
          <label className="stack" style={{ minWidth: 140 }}>
            <span className="small">Host Web Port</span>
            <input
              value={hostEndpoint.port}
              onChange={(event) => patchCompanionNetwork({ hostPort: event.target.value })}
              placeholder="5173"
              inputMode="numeric"
            />
          </label>
          <label className="stack" style={{ minWidth: 140 }}>
            <span className="small">Relay Port</span>
            <input
              value={relayEndpoint.port}
              onChange={(event) => patchCompanionNetwork({ relayPort: event.target.value })}
              placeholder="8787"
              inputMode="numeric"
            />
          </label>
          <button className="primary" onClick={enableCompanionMode}>
            Enable Companion Mode
          </button>
          <button className="warn" onClick={revokeSession} disabled={!pairing}>
            Revoke
          </button>
        </div>

        {pairing ? (
          <div className="stack">
            <div className="small">Session: {pairing.sessionId}</div>
            <div className="small">Pairing code: {pairing.pairingCode}</div>
            <div className="small">Connected devices: {connectedDeviceCount}</div>
            <div className="small">Remote URL: {remoteJoinUrl}</div>
            <div className="small">Phone Relay: {publicRelayUrl}</div>
            {remoteJoinUrl ? (
              <div className="row">
                <a href={remoteJoinUrl} target="_blank" rel="noreferrer">
                  Open Remote Preview
                </a>
              </div>
            ) : null}
            {qrDataUrl ? <img src={qrDataUrl} alt="Pairing QR" width={220} height={220} /> : null}
          </div>
        ) : (
          <div className="small">Companion mode is currently disabled.</div>
        )}
      </section>

      <section className="card stack">
        <strong>Import / Export</strong>
        <div className="row">
          <button onClick={onExport}>Export JSON</button>
          <label>
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void onImport(file);
                }
              }}
            />
          </label>
        </div>
        {importError ? <div className="small">Import error: {importError}</div> : null}
      </section>

      {padModalState && padModalDraft ? (
        <PadEditorModal
          mode={padModalState.mode}
          draft={padModalDraft}
          hotkeys={hotkeys}
          pages={pages}
          onClose={() => setPadModalState(null)}
          onSubmit={onSubmitPadForm}
        />
      ) : null}
    </div>
  );
}

function toPadSnapshot(pads: TriggerPad[]): PadSnapshot[] {
  return pads.map((pad) => ({
    id: pad.id,
    label: pad.label,
    color: pad.color,
    enabled: pad.enabled,
    sortOrder: pad.sortOrder,
    pageId: pad.pageId,
  }));
}

function formatActionType(actionType: TriggerAction["type"]): string {
  if (actionType === "vts_hotkey") return "VTS Hotkey";
  if (actionType === "play_sound") return "Play Sound";
  return "Multi";
}

function buildRemoteJoinUrl(baseOrigin: string, sessionId: string, token: string, relayUrl: string): string {
  const origin = baseOrigin.replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("token", token);
  if (relayUrl) {
    params.set("relay", relayUrl);
  }
  return `${origin}/remote/${sessionId}?${params.toString()}`;
}

function derivePublicRelayUrl(relayUrl: string, configuredPublicRelayUrl: string | undefined, publicHostOrigin: string): string {
  if (configuredPublicRelayUrl?.trim()) {
    return normalizeRelayUrl(configuredPublicRelayUrl, relayUrl);
  }

  try {
    const relay = new URL(normalizeRelayUrl(relayUrl, "ws://localhost:8787"));
    if (relay.hostname !== "localhost" && relay.hostname !== "127.0.0.1") {
      return relay.toString().replace(/\/$/, "");
    }

    const hostUrl = new URL(publicHostOrigin);
    const next = new URL(relay.toString());
    next.hostname = hostUrl.hostname;
    return next.toString().replace(/\/$/, "");
  } catch {
    return relayUrl;
  }
}

type PadFormDraft = {
  pageId: string;
  label: string;
  color: string;
  mode: "tap" | "hold";
  enabled: boolean;
  actionType: TriggerAction["type"];
  hotkeyId: string;
  soundId: string;
  volume: string;
  multiJson: string;
};

type PadEditorModalProps = {
  mode: "create" | "edit";
  draft: PadFormDraft;
  hotkeys: Array<{ id: string; name: string }>;
  pages: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (draft: PadFormDraft) => void;
};

function createPadDraft(input: { pageId: string }): PadFormDraft {
  return {
    pageId: input.pageId,
    label: "",
    color: "#d9e2ec",
    mode: "tap",
    enabled: true,
    actionType: "vts_hotkey",
    hotkeyId: "",
    soundId: "",
    volume: "",
    multiJson: "[]",
  };
}

function draftFromPad(pad: TriggerPad): PadFormDraft {
  return {
    pageId: pad.pageId,
    label: pad.label,
    color: pad.color ?? "#d9e2ec",
    mode: pad.mode,
    enabled: pad.enabled,
    actionType: pad.action.type,
    hotkeyId: pad.action.type === "vts_hotkey" ? pad.action.hotkeyId : "",
    soundId: pad.action.type === "play_sound" ? pad.action.soundId : "",
    volume: pad.action.type === "play_sound" && pad.action.volume !== undefined ? String(pad.action.volume) : "",
    multiJson: pad.action.type === "multi" ? JSON.stringify(pad.action.actions, null, 2) : "[]",
  };
}

function padActionFromDraft(draft: PadFormDraft): TriggerAction {
  if (draft.actionType === "vts_hotkey") {
    return {
      type: "vts_hotkey",
      hotkeyId: draft.hotkeyId,
    };
  }

  if (draft.actionType === "play_sound") {
    return {
      type: "play_sound",
      soundId: draft.soundId,
      volume: draft.volume ? Number(draft.volume) : undefined,
    };
  }

  try {
    const parsed = JSON.parse(draft.multiJson) as TriggerAction[];
    if (!Array.isArray(parsed)) {
      return { type: "multi", actions: [] };
    }
    return { type: "multi", actions: parsed };
  } catch {
    return { type: "multi", actions: [] };
  }
}

function PadEditorModal({ mode, draft, hotkeys, pages, onClose, onSubmit }: PadEditorModalProps) {
  const [localDraft, setLocalDraft] = useState<PadFormDraft>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card card stack" onClick={(event) => event.stopPropagation()}>
        <div className="row modal-header" style={{ justifyContent: "space-between" }}>
          <strong>{mode === "create" ? "Add Soundboard Button" : "Edit Soundboard Button"}</strong>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="row modal-grid">
          <label className="stack" style={{ minWidth: 180 }}>
            <span className="small">Label</span>
            <input
              value={localDraft.label}
              onChange={(event) => setLocalDraft({ ...localDraft, label: event.target.value })}
              placeholder="Button label"
            />
          </label>
          <label className="stack" style={{ minWidth: 140 }}>
            <span className="small">Color</span>
            <input
              value={localDraft.color}
              onChange={(event) => setLocalDraft({ ...localDraft, color: event.target.value })}
              placeholder="#d9e2ec"
            />
          </label>
          <label className="stack" style={{ minWidth: 160 }}>
            <span className="small">Page</span>
            <select value={localDraft.pageId} onChange={(event) => setLocalDraft({ ...localDraft, pageId: event.target.value })}>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row modal-grid">
          <label className="stack" style={{ minWidth: 140 }}>
            <span className="small">Trigger Mode</span>
            <select
              value={localDraft.mode}
              onChange={(event) =>
                setLocalDraft({
                  ...localDraft,
                  mode: event.target.value === "hold" ? "hold" : "tap",
                })
              }
            >
              <option value="tap">Tap</option>
              <option value="hold">Hold</option>
            </select>
          </label>
          <label className="stack" style={{ minWidth: 200 }}>
            <span className="small">Action Type</span>
            <select
              value={localDraft.actionType}
              onChange={(event) => {
                const actionType = event.target.value as TriggerAction["type"];
                setLocalDraft({
                  ...localDraft,
                  actionType,
                  hotkeyId: actionType === "vts_hotkey" ? localDraft.hotkeyId : "",
                  soundId: actionType === "play_sound" ? localDraft.soundId : "",
                  volume: actionType === "play_sound" ? localDraft.volume : "",
                });
              }}
            >
              <option value="vts_hotkey">VTS Hotkey</option>
              <option value="play_sound">Play Sound</option>
              <option value="multi">Multi (JSON)</option>
            </select>
          </label>
          <label className="row modal-checkbox" style={{ marginTop: "1.5rem" }}>
            <input
              type="checkbox"
              checked={localDraft.enabled}
              onChange={(event) => setLocalDraft({ ...localDraft, enabled: event.target.checked })}
            />
            Enabled
          </label>
        </div>

        {localDraft.actionType === "vts_hotkey" ? (
          <label className="stack">
            <span className="small">VTS Hotkey</span>
            <select
              value={localDraft.hotkeyId}
              onChange={(event) => setLocalDraft({ ...localDraft, hotkeyId: event.target.value })}
            >
              <option value="">Select hotkey</option>
              {hotkeys.map((hotkey) => (
                <option key={hotkey.id} value={hotkey.id}>
                  {hotkey.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {localDraft.actionType === "play_sound" ? (
          <div className="row">
            <label className="stack" style={{ minWidth: 220 }}>
              <span className="small">Sound ID</span>
              <input
                value={localDraft.soundId}
                onChange={(event) => setLocalDraft({ ...localDraft, soundId: event.target.value })}
                placeholder="sound_id"
              />
            </label>
            <label className="stack" style={{ minWidth: 140 }}>
              <span className="small">Volume (0-1)</span>
              <input
                value={localDraft.volume}
                onChange={(event) => setLocalDraft({ ...localDraft, volume: event.target.value })}
                placeholder="1"
                inputMode="decimal"
              />
            </label>
          </div>
        ) : null}

        {localDraft.actionType === "multi" ? (
          <label className="stack">
            <span className="small">Multi Actions JSON</span>
            <textarea
              className="modal-textarea"
              value={localDraft.multiJson}
              onChange={(event) => setLocalDraft({ ...localDraft, multiJson: event.target.value })}
            />
          </label>
        ) : null}

        <div className="row modal-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="button" onClick={() => onSubmit(localDraft)}>
            Save Button
          </button>
        </div>
      </section>
    </div>
  );
}
