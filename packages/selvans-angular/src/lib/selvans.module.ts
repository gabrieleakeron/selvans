import { ModuleWithProviders, NgModule, Provider } from '@angular/core';
import { SelvansConfig } from './selvans.config';
import { SelvansTargetDirective } from './directives/selvans-target.directive';
import { SelvansNodeDirective } from './directives/selvans-node.directive';
import { SelvansPanelComponent } from './components/selvans-panel/selvans-panel.component';
import { SelvansProviders } from './provide-selvans';

@NgModule({
  imports: [SelvansTargetDirective, SelvansNodeDirective, SelvansPanelComponent],
  exports: [SelvansTargetDirective, SelvansNodeDirective, SelvansPanelComponent],
})
export class SelvansModule {
  /**
   * NgModule bootstrap helper.
   * For standalone bootstrapping prefer `provideSelvans(config)`.
   */
  static forRoot(config: SelvansConfig): ModuleWithProviders<SelvansModule> {
    return {
      ngModule: SelvansModule,
      providers: SelvansProviders(config) as Provider[],
    };
  }
}
