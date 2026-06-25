import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { McpBridgeService, BridgeStatus } from '../../services/mcp-bridge.service';

/**
 * Optional status indicator component.
 * Shows the current connection state to the selvans backend.
 *
 * Usage: <selvans-panel />
 */
@Component({
  selector: 'selvans-panel',
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="Selvans-panel" [attr.data-status]="status$ | async">
      <span class="Selvans-dot"></span>
      <span class="Selvans-label">AI {{ status$ | async }}</span>
    </div>
  `,
  styles: [`
    .Selvans-panel {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-family: monospace;
      background: rgba(0 0 0 / 0.65);
      color: #ccc;
      user-select: none;
    }
    .Selvans-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    [data-status="connected"]    { color: #4ade80; }
    [data-status="connecting"]   { color: #fbbf24; }
    [data-status="error"]        { color: #f87171; }
    [data-status="disconnected"] { color: #6b7280; }
  `],
})
export class SelvansPanelComponent {
  public status$;
  constructor(private bridge: McpBridgeService) {
    this.status$ = bridge.status$;
  }
}
