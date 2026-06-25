export type NodeTemplate =
  | 'layout'    // structural wrapper (app shell, grid)
  | 'page'      // routed view
  | 'menu'      // navigation bar
  | 'nav'       // secondary navigation (breadcrumb, sidebar)
  | 'form'      // data input container
  | 'list'      // repeated items
  | 'table'     // tabular data
  | 'dialog'    // modal / overlay
  | 'widget'    // self-contained functional unit
  | 'component'; // generic leaf element

export type NodeAction = 'click' | 'fill' | 'read' | 'navigate' | 'scroll';

export interface SelvansNodeInput {
  id: string;
  /** Defaults to 'component' */
  template?: NodeTemplate;
  description: string;
  /** For 'page' nodes — the Angular route this node represents */
  route?: string;
  /** Actions the AI is allowed to perform on this node */
  actions?: NodeAction[];
}

export interface SelvansNodeData {
  id: string;
  template: NodeTemplate;
  description: string;
  route?: string;
  actions: NodeAction[];
  children: SelvansNodeData[];
}
