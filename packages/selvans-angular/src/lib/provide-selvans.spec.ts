import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { provideSelvans } from './provide-selvans';
import { selvans_CONFIG } from './selvans.config';
import { McpBridgeService } from './services/mcp-bridge.service';
import { SelvansService } from './services/selvans.service';

/**
 * Minimal McpBridgeService stub — avoids real WebSocket connections during tests.
 */
class McpBridgeServiceStub {
  status$ = new BehaviorSubject<'disconnected' | 'connected' | 'connecting' | 'error'>('disconnected');
  toolCall$ = new Subject<{ name: string; args: Record<string, unknown> }>();
  connect = jest.fn();
  disconnect = jest.fn();
  registerTool = jest.fn();
  registerTools = jest.fn();
  toolList = jest.fn().mockReturnValue([]);
  sendRegistration = jest.fn();
  sendStructureUpdate = jest.fn();
  ngOnDestroy = jest.fn();
}

describe('provideSelvans', () => {
  const TEST_CONFIG = { coreUrl: 'http://test-core:8080', appId: 'test-app' };

  let bridgeStub: McpBridgeServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideSelvans(TEST_CONFIG),
        { provide: McpBridgeService, useClass: McpBridgeServiceStub },
      ],
    });
    bridgeStub = TestBed.inject(McpBridgeService) as unknown as McpBridgeServiceStub;
  });

  it('should inject selvans_CONFIG with the provided value', () => {
    const config = TestBed.inject(selvans_CONFIG);
    expect(config).toEqual(TEST_CONFIG);
    expect(config.coreUrl).toBe('http://test-core:8080');
    expect(config.appId).toBe('test-app');
  });

  it('should make SelvansService resolvable', () => {
    const service = TestBed.inject(SelvansService);
    expect(service).toBeTruthy();
  });

  it('should make McpBridgeService resolvable', () => {
    const bridge = TestBed.inject(McpBridgeService);
    expect(bridge).toBeTruthy();
  });

  it('should pass the config coreUrl to bridge.connect (not the hardcoded default)', () => {
    // SelvansService constructor calls bridge.connect(config) when autoConnect !== false.
    // Bug regression: if @Inject(selvans_CONFIG) on a field was used, config stayed on
    // the hardcoded default { coreUrl: 'ws://localhost:8080', ... } and the provided value
    // was silently ignored.
    TestBed.inject(SelvansService); // ensure constructed
    expect(bridgeStub.connect).toHaveBeenCalledWith(
      expect.objectContaining({ coreUrl: 'http://test-core:8080', appId: 'test-app' })
    );
  });

  it('should call sendRegistration when bridge emits "connected" (DestroyRef regression)', () => {
    // Bug regression: takeUntilDestroyed() without explicit DestroyRef in provideAppInitializer
    // context completed the subscription before the WS ever connected → sendRegistration never called.
    TestBed.inject(SelvansService); // ensure constructed

    // Simulate WS connection
    bridgeStub.status$.next('connected');

    // Run any pending async microtasks / Angular CD inside the test zone
    TestBed.flushEffects();

    expect(bridgeStub.sendRegistration).toHaveBeenCalledTimes(1);
    expect(bridgeStub.sendRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ appType: 'frontend', appId: 'test-app' })
    );
  });
});
