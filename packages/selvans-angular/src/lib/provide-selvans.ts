import { EnvironmentProviders, inject, makeEnvironmentProviders, Provider, provideAppInitializer } from '@angular/core';
import { SelvansConfig, selvans_CONFIG } from './selvans.config';
import { McpBridgeService } from './services/mcp-bridge.service';
import { SelvansService } from './services/selvans.service';
import {
  ClickElementTool,
  FormInputTool,
  GetElementsTool,
  GetPageStateTool,
  NavigateTool,
} from './tools/built-in-tools';

/**
 * Internal shared provider list used by both `provideSelvans` and
 * `SelvansModule.forRoot`. Keep this as the single source of truth so
 * standalone and NgModule bootstraps stay in sync.
 */
export function SelvansProviders(config: SelvansConfig): (Provider | EnvironmentProviders)[] {
  return [
    { provide: selvans_CONFIG, useValue: config },
    McpBridgeService,
    SelvansService,
    GetPageStateTool,
    NavigateTool,
    GetElementsTool,
    ClickElementTool,
    FormInputTool,
    provideAppInitializer(() => {
      inject(SelvansService);
    }),
  ];
}

/**
 * Standalone (non-NgModule) bootstrap helper.
 *
 * Usage:
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideSelvans({ coreUrl: 'http://localhost:8080', appId: 'my-app' })],
 * });
 * ```
 */
export function provideSelvans(config: SelvansConfig): EnvironmentProviders {
  return makeEnvironmentProviders(SelvansProviders(config));
}
