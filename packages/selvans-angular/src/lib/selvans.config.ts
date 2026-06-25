import { InjectionToken } from '@angular/core';

export interface SelvansConfig {
  /** URL of the selvans Core service (e.g. http://localhost:8080) */
  coreUrl: string;
  /** Unique identifier for this frontend instance */
  appId?: string;
  /** Connect automatically on module init (default: true) */
  autoConnect?: boolean;
  /** Reconnection delay in ms (default: 3000) */
  reconnectDelay?: number;
}

export const selvans_CONFIG = new InjectionToken<SelvansConfig>('selvans_CONFIG');
