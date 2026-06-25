import { Directive, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { NodeRegistryService } from '../tree/node-registry.service';
import { SelvansNodeService } from '../tree/selvans-node.service';
import { SelvansNodeInput } from '../tree/node.types';

/**
 * Marks a component as a node in the selvans UI tree.
 *
 * Usage:
 *   <nav [SelvansNode]="{ id: 'main-nav', template: 'menu', description: 'Top navigation' }">
 *     <a [SelvansNode]="{ id: 'nav-home', description: 'Go to home', actions: ['click'] }">Home</a>
 *   </nav>
 *
 * The directive provides its own SelvansNodeService instance,
 * so nested [SelvansNode] elements automatically discover their parent
 * via Angular's hierarchical DI (inject with skipSelf).
 */
@Directive({
  selector: '[SelvansNode]',
  standalone: true,
  providers: [SelvansNodeService],
})
export class SelvansNodeDirective implements OnInit, OnDestroy {
  @Input({ required: true }) SelvansNode!: SelvansNodeInput;

  private self = inject(SelvansNodeService);
  private parent = inject(SelvansNodeService, { optional: true, skipSelf: true });
  private registry = inject(NodeRegistryService);

  ngOnInit(): void {
    this.self.init(this.SelvansNode);
    if (this.parent) {
      this.parent.addChild(this.self);
    } else {
      this.registry.addRoot(this.self);
    }
  }

  ngOnDestroy(): void {
    if (this.parent) {
      this.parent.removeChild(this.self);
    } else {
      this.registry.removeRoot(this.self);
    }
  }
}
