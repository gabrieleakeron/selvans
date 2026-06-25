import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, filter } from 'rxjs';
import { SelvansConfig, selvans_CONFIG } from '../selvans.config';
import { McpBridgeService } from './mcp-bridge.service';
import { NodeRegistryService } from '../tree/node-registry.service';
import { SelvansTool } from '../tools/base-tool';
import {
  ClickElementTool,
  FormInputTool,
  GetElementsTool,
  GetPageStateTool,
  NavigateTool,
} from '../tools/built-in-tools';

/**
 * Orchestrates the selvans protocol:
 *  - Registers built-in tools with the bridge
 *  - Sends full registration whenever the WS (re)connects
 *  - Sends structure_update whenever the UI tree changes
 */
@Injectable()
export class SelvansService {

  // ── DI via inject() — works in any injection context (including provideAppInitializer) ──

  /**
   * The DestroyRef tied to THIS service's lifetime (environment injector).
   * Must be explicit here because the service is instantiated via provideAppInitializer,
   * whose own injection context is destroyed immediately after bootstrap. Calling
   * takeUntilDestroyed() without an argument inside the constructor would capture that
   * ephemeral DestroyRef and complete subscriptions before the WS ever connects.
   */
  private readonly destroyRef = inject(DestroyRef);

  /**
   * inject(selvans_CONFIG) is the Angular 14+ idiomatic way to resolve an
   * InjectionToken on a field. @Inject() as a field decorator is NOT supported
   * by Angular's DI — the value would never be injected and config would stay on
   * the hardcoded default. inject() on a field initializer works in any
   * injection context (constructor, field, factory).
   */
  private readonly config = inject(selvans_CONFIG);

  /**
   * Same issue: @Optional() as a field decorator is not processed by Angular.
   * inject(Router, { optional: true }) is the correct idiom for optional deps.
   */
  private readonly router = inject(Router, { optional: true });

  private readonly bridge = inject(McpBridgeService);
  private readonly registry = inject(NodeRegistryService);

  // Built-in tools resolved via inject() — avoids constructor-parameter boilerplate
  private readonly getPageState = inject(GetPageStateTool);
  private readonly navigate = inject(NavigateTool);
  private readonly getElements = inject(GetElementsTool);
  private readonly clickElement = inject(ClickElementTool);
  private readonly formInput = inject(FormInputTool);

  // ── Public observables ────────────────────────────────────────────────────

  public readonly status$ = this.bridge.status$;
  public readonly toolCall$ = this.bridge.toolCall$;

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor() {
    this.bridge.registerTools([
      this.getPageState,
      this.navigate,
      this.getElements,
      this.clickElement,
      this.formInput,
    ]);

    // Send full registration whenever the WS (re)connects.
    // takeUntilDestroyed(this.destroyRef) uses the service's own DestroyRef,
    // not the initializer's ephemeral one, so the subscription stays alive
    // for the full lifetime of the service.
    this.bridge.status$.pipe(
      filter((s) => s === 'connected'),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this._sendRegistration());

    // Send structure_update on tree changes (debounced — batch simultaneous mounts)
    this.registry.change$.pipe(
      debounceTime(50),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      if (this.bridge.status$.value === 'connected') {
        this.bridge.sendStructureUpdate(this.registry.serialize(), this._currentRoute());
      }
    });

    if (this.config.autoConnect !== false) {
      this.bridge.connect(this.config);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Register a custom frontend tool that the AI can call */
  registerTool(tool: SelvansTool): void {
    this.bridge.registerTool(tool);
    if (this.bridge.status$.value === 'connected') {
      this._sendRegistration();
    }
  }

  connect(): void {
    this.bridge.connect(this.config);
  }

  disconnect(): void {
    this.bridge.disconnect();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _sendRegistration(): void {
    this.bridge.sendRegistration({
      appId: this.config.appId ?? 'selvans-app',
      appType: 'frontend',
      tools: this.bridge.toolList(),
      trees: this.registry.serialize(),
      currentRoute: this._currentRoute(),
    });
  }

  private _currentRoute(): string {
    return this.router?.url ?? '/';
  }
}
