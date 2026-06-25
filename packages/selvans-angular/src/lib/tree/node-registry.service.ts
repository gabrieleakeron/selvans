import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SelvansNodeData } from './node.types';
import { SelvansNodeService } from './selvans-node.service';

/**
 * Singleton that holds all root nodes (forest roots).
 * Emits change$ whenever the tree structure changes so the bridge can
 * send a structure_update to the backend.
 */
@Injectable({ providedIn: 'root' })
export class NodeRegistryService {
  private roots: SelvansNodeService[] = [];
  readonly change$ = new Subject<void>();

  addRoot(node: SelvansNodeService): void {
    this.roots.push(node);
    this.change$.next();
  }

  removeRoot(node: SelvansNodeService): void {
    const idx = this.roots.indexOf(node);
    if (idx !== -1) {
      this.roots.splice(idx, 1);
      this.change$.next();
    }
  }

  serialize(): SelvansNodeData[] {
    return this.roots.map((r) => r.serialize());
  }
}
