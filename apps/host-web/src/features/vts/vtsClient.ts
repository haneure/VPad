import type { VtsHotkey } from "./useVtsStore";

interface VtsRequestPayload {
  requestID: string;
  messageType: string;
  data?: Record<string, unknown>;
}

interface VtsResponsePayload {
  requestID?: string;
  messageType: string;
  data?: Record<string, unknown>;
}

export interface VtsClient {
  connect(host: string, port: number): Promise<void>;
  disconnect(): Promise<void>;
  authenticate(pluginName: string, pluginDeveloper: string): Promise<void>;
  restoreToken(token: string): Promise<boolean>;
  listHotkeys(): Promise<Array<{ id: string; name: string }>>;
  triggerHotkey(hotkeyId: string): Promise<void>;
}

type PendingRequest = {
  resolve: (value: VtsResponsePayload) => void;
  reject: (reason?: unknown) => void;
};

export class WebSocketVtsClient implements VtsClient {
  private ws?: WebSocket;
  private authToken?: string;
  private pending = new Map<string, PendingRequest>();

  async connect(host: string, port: number): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://${host}:${port}`);
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener("error", onError);
        resolve();
      };

      const onError = (event: Event) => {
        ws.removeEventListener("open", onOpen);
        reject(new Error(`VTS connection failed: ${String(event.type)}`));
      };

      ws.addEventListener("open", onOpen, { once: true });
      ws.addEventListener("error", onError, { once: true });
    });

    ws.addEventListener("message", (event) => this.handleMessage(event.data));
    ws.addEventListener("close", () => {
      this.ws = undefined;
      for (const req of this.pending.values()) {
        req.reject(new Error("VTS connection closed"));
      }
      this.pending.clear();
    });
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;
    this.ws.close();
    this.ws = undefined;
  }

  async authenticate(pluginName: string, pluginDeveloper: string): Promise<void> {
    const tokenResponse = await this.sendRequest("AuthenticationTokenRequest", {
      pluginName,
      pluginDeveloper,
    });

    const token = String(tokenResponse.data?.authenticationToken ?? "");
    if (!token) {
      throw new Error("Authentication token was not returned by VTS.");
    }

    this.authToken = token;
    await this.sendRequest("AuthenticationRequest", {
      pluginName,
      pluginDeveloper,
      authenticationToken: token,
    });
  }

  async restoreToken(token: string): Promise<boolean> {
    this.authToken = token;
    try {
      await this.sendRequest("AuthenticationRequest", {
        pluginName: "VPad",
        pluginDeveloper: "VPad",
        authenticationToken: token,
      });
      return true;
    } catch {
      return false;
    }
  }

  async listHotkeys(): Promise<VtsHotkey[]> {
    const response = await this.sendRequest("HotkeysInCurrentModelRequest", {});
    const hotkeys = (response.data?.availableHotkeys as Array<Record<string, unknown>> | undefined) ?? [];
    return hotkeys.map((hotkey) => ({
      id: String(hotkey.hotkeyID ?? ""),
      name: String(hotkey.name ?? hotkey.hotkeyID ?? "Unnamed Hotkey"),
    }));
  }

  async triggerHotkey(hotkeyId: string): Promise<void> {
    await this.sendRequest("HotkeyTriggerRequest", {
      hotkeyID: hotkeyId,
    });
  }

  getToken(): string | undefined {
    return this.authToken;
  }

  private async sendRequest(messageType: string, data?: Record<string, unknown>): Promise<VtsResponsePayload> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("VTS socket is not connected.");
    }

    const requestID = crypto.randomUUID();
    const payload = {
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      messageType,
      requestID,
      data,
    } as VtsRequestPayload & { apiName: string; apiVersion: string };

    const result = await new Promise<VtsResponsePayload>((resolve, reject) => {
      this.pending.set(requestID, { resolve, reject });
      ws.send(JSON.stringify(payload));

      setTimeout(() => {
        if (!this.pending.has(requestID)) return;
        this.pending.delete(requestID);
        reject(new Error(`VTS request timeout for ${messageType}`));
      }, 7000);
    });

    if (result.messageType === "APIError") {
      throw new Error(String(result.data?.message ?? "VTS API error"));
    }

    return result;
  }

  private handleMessage(raw: unknown) {
    if (typeof raw !== "string") return;

    let parsed: VtsResponsePayload;
    try {
      parsed = JSON.parse(raw) as VtsResponsePayload;
    } catch {
      return;
    }

    if (!parsed.requestID) return;
    const pending = this.pending.get(parsed.requestID);
    if (!pending) return;

    this.pending.delete(parsed.requestID);
    pending.resolve(parsed);
  }
}
