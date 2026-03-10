import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { AnyRelayToClientMessage } from "@vpad/shared-protocol";
import { RelayClient } from "../features/remote/relayClient";
import { useRemoteStore } from "../features/remote/useRemoteStore";
import { useSettingsStore } from "../features/actions/useSettingsStore";
import { normalizeRelayUrl } from "../utils/network";

export function RemotePage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const relayFromQuery = searchParams.get("relay") ?? undefined;

  const relay = useMemo(() => new RelayClient(), []);
  const settings = useSettingsStore((state) => state.settings);

  const status = useRemoteStore((state) => state.status);
  const layout = useRemoteStore((state) => state.layout);
  const setLayout = useRemoteStore((state) => state.setLayout);
  const setStatus = useRemoteStore((state) => state.setStatus);
  const setConnectedDeviceCount = useRemoteStore((state) => state.setConnectedDeviceCount);
  const connectedDeviceCount = useRemoteStore((state) => state.connectedDeviceCount);
  const setError = useRemoteStore((state) => state.setError);
  const error = useRemoteStore((state) => state.error);

  const [manualCode, setManualCode] = useState("");
  const [deviceId, setDeviceId] = useState<string>();

  const resolvedRelayUrl = normalizeRelayUrl(
    relayFromQuery || settings.publicRelayUrl?.trim() || settings.relayUrl || "ws://localhost:8787",
    "ws://localhost:8787",
  );

  useEffect(() => {
    const unsub = relay.onMessage((message: AnyRelayToClientMessage) => {
      switch (message.type) {
        case "remote:joined": {
          setStatus("connected");
          setDeviceId(message.payload.deviceId);
          setLayout(message.payload.layout);
          setConnectedDeviceCount(message.payload.connectedDeviceCount);
          break;
        }
        case "layout:updated": {
          setLayout(message.payload.layout);
          break;
        }
        case "session:error": {
          setError(message.payload.message);
          break;
        }
        case "session:revoked": {
          setError(`Session revoked: ${message.payload.reason}`);
          setStatus("error");
          break;
        }
        case "remote:left": {
          setConnectedDeviceCount(message.payload.connectedDeviceCount);
          break;
        }
        case "session:created":
        case "remote:event":
        case "pong":
          break;
      }
    });

    return () => {
      unsub();
      relay.disconnect();
    };
  }, [relay, setConnectedDeviceCount, setError, setLayout, setStatus]);

  useEffect(() => {
    if (!sessionId || !token) return;

    void (async () => {
      setStatus("connecting");
      try {
        await relay.connect(resolvedRelayUrl);
        relay.joinSession({ sessionId, pairingToken: token, deviceName: "phone-remote" });
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to join session");
      }
    })();
  }, [relay, resolvedRelayUrl, sessionId, setError, setStatus, token]);

  async function joinWithCode() {
    if (!sessionId || !manualCode) return;

    setStatus("connecting");
    try {
      await relay.connect(resolvedRelayUrl);
      relay.joinSession({ sessionId, pairingCode: manualCode, deviceName: "phone-remote" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to join session");
    }
  }

  function pressPad(padId: string) {
    if (!sessionId || !deviceId || status !== "connected") return;
    relay.sendPadPress({ sessionId, deviceId, padId });
  }

  function releasePad(padId: string) {
    if (!sessionId || !deviceId || status !== "connected") return;
    relay.sendPadRelease({ sessionId, deviceId, padId });
  }

  if (!sessionId) {
    return <div className="remote-root">Invalid session URL.</div>;
  }

  return (
    <div className="remote-root remote-theme">
      <header className="remote-header remote-panel">
        <div className="remote-title">
          <strong>VPad Remote</strong>
          <div className="small">Session {sessionId}</div>
        </div>
        <div className={`remote-status remote-status-${status}`}>
          <span className="remote-status-dot" />
          {formatStatus(status)}
        </div>
      </header>

      {status !== "connected" ? (
        <section className="remote-join remote-panel stack">
          <strong>Connect Remote</strong>
          <div className="small">Relay: {resolvedRelayUrl}</div>
          <div className="row">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="6-digit pairing code"
              inputMode="numeric"
            />
            <button className="primary" onClick={joinWithCode}>
              Join
            </button>
          </div>
          <div className="small">Tip: scanning QR auto-connects and skips manual code.</div>
          {error ? <div className="small">Error: {error}</div> : null}
        </section>
      ) : null}

      <section className="remote-board remote-panel">
        <div className="remote-board-meta small">Connected devices: {connectedDeviceCount}</div>
        <div className="remote-grid">
          {layout
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((pad) => (
              <button
                key={pad.id}
                className="remote-pad"
                style={{ background: pad.color ?? "#d9e2ec" }}
                onPointerDown={() => pressPad(pad.id)}
                onPointerUp={() => releasePad(pad.id)}
                onPointerCancel={() => releasePad(pad.id)}
                disabled={!pad.enabled || status !== "connected"}
              >
                <span className="remote-pad-label">{pad.label}</span>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
