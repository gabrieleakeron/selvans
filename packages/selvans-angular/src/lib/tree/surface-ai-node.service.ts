import { Injectable } from '@angular/core';
import { NodeAction, NodeTemplate, SelvansNodeData, SelvansNodeInput } from './node.types';

/**
 * One instance per component that uses [SelvansNode].
 * Provided at component level — NOT root level — so the DI tree mirrors the component tree.
 */
@Injectable()
export class SelvansNodeService {
  private _id = '';
  private _template: NodeTemplate = 'component';
  private _description = '';
  private _route?: string;
  private _actions: NodeAction[] = [];
  private _children: SelvansNodeService[] = [];

  init(input: SelvansNodeInput): void {
    this._id = input.id;
    this._template = input.template ?? 'component';
    this._description = input.description;
    this._route = input.route;
    this._actions = input.actions ?? [];
  }

  addChild(child: SelvansNodeService): void {
    this._children.push(child);
  }

  removeChild(child: SelvansNodeService): void {
    const idx = this._children.indexOf(child);
    if (idx !== -1) this._children.splice(idx, 1);
  }

  serialize(): SelvansNodeData {
    return {
      id: this._id,
      template: this._template,
      description: this._description,
      ...(this._route ? { route: this._route } : {}),
      actions: this._actions,
      children: this._children.map((c) => c.serialize()),
    };
  }
}
