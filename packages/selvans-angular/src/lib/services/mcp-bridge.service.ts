import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SelvansConfig } from '../selvans.config';
import { SelvansTool } from '../tools/base-tool';
import { SelvansNodeData } from '../tree/node.types';

export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── Inbound messages (Backend → Frontend) ────────────────────────────────────

interface ToolCallMessage {
  type: 'tool_call';
  id: string;
  tool: string;
  args: Record<string, unknown>;
}
interface PingMessage { type: 'ping'; }
interface RegistrationAckMessage { type: 'registration_ack'; }

type InboundMessage = ToolCallMessage | PingMessage | RegistrationAckMessage;

// ── Outbound messages (Frontend → Backend) ───────────────────────────────────

export interface RegistrationPayload {
  appId: string;
  appType: 'frontend';
  tools: Array<{ name: string; description: string; inputSchema: object }>;
  trees: SelvansNodeData[];
  currentRoute: string;
}

interface RegistrationMessage extends RegistrationPayload {
  type: 'registration';
}
interface StructureUpdateMessage {
  type: 'structure_update';
  trees: SelvansNodeData[];
  currentRoute: string;
}
interface ToolResultMessage {
  type: 'tool_result';
  id: string;
  result?: unknown;
  error?: string;
}
interface PongMessage { type: 'pong'; }

type OutboundMessage =
  | RegistrationMessage
  | StructureUpdateMessage
  | ToolResultMessage
  | PongMessage;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Low-level WebSocket transport for the selvans protocol.
 *
 * Responsibilities:
 *  - Manage WS connection lifecycle (connect, reconnect, disconnect)
 *  - Maintain the tool registry and dispatch tool_call messages
 *  - Expose send methods for registration and structure updates
 *
 * Orchestration (when to send what) is handled by SelvansService.
 */
@Injectable({ providedIn: 'root' })
export class McpBridgeService implements OnDestroy {
  private ws: WebSocket | null = null;
  private tools = new Map<string, SelvansTool>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private config: SelvansConfig | null = null;

  readonly status$ = new BehaviorSubject<BridgeStatus>('disconnected');
  readonly toolCall$ = new Subject<{ name: string; args: Record<string, unknown> }>();

  connect(config: SelvansConfig): void {
    this.config = config;
    this._open();
  }

  registerTool(tool: SelvansTool): void {
    this.tools.set(tool.name, tool);
  }

  registerTools(tools: SelvansTool[]): void {
    tools.forEach((t) => this.registerTool(t));
  }

  toolList(): Array<{ name: string; description: string; inputSchema: object }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close(1000, 'Manual disconnect');
    this.ws = null;
    this.status$.next('disconnected');
  }

  // ── Protocol send methods ─────────────────────────────────────────────────

  sendRegistration(payload: RegistrationPayload): void {
    this._send({ type: 'registration', ...payload });
  }

  sendStructureUpdate(trees: SelvansNodeData[], currentRoute: string): void {
    this._send({ type: 'structure_update', trees, currentRoute });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.disconnect();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _open(): void {
    if (!this.config) return;
    this.status$.next('connecting');

    const wsUrl = this.config.coreUrl.replace(/^http/, 'ws') + '/Selvans/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.status$.next('connected');
      // Registration is triggered by SelvansService reacting to status$ = 'connected'
    };

    this.ws.onmessage = async (event: MessageEvent<string>) => {
      const msg = JSON.parse(event.data) as InboundMessage;
      await this._handle(msg);
    };

    this.ws.onerror = () => {
      this.status$.next('error');
    };

    this.ws.onclose = ({ code }) => {
      if (code !== 1000) {
        this.status$.next('disconnected');
        this._scheduleReconnect();
      }
    };
  }

  private async _handle(msg: InboundMessage): Promise<void> {
    if (msg.type === 'ping') {
      this._send({ type: 'pong' });
      return;
    }

    if (msg.type === 'tool_call') {
      this.toolCall$.next({ name: msg.tool, args: msg.args });
      const tool = this.tools.get(msg.tool);

      if (!tool) {
        this._send({ type: 'tool_result', id: msg.id, error: `Tool "${msg.tool}" not registered` });
        return;
      }

      try {
        const result = await tool.execute(msg.args ?? {});
        this._send({ type: 'tool_result', id: msg.id, result });
      } catch (err: unknown) {
        this._send({
          type: 'tool_result',
          id: msg.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private _send(msg: OutboundMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private _scheduleReconnect(): void {
    const delay = this.config?.reconnectDelay ?? 3000;
    this.reconnectTimer = setTimeout(() => this._open(), delay);
  }
}
