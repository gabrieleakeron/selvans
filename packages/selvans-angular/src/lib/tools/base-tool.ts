export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: unknown[];
  }>;
  required?: string[];
}

export interface SelvansTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute(input: Record<string, unknown>): Promise<unknown>;
}

export abstract class BaseTool implements SelvansTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: ToolInputSchema;
  abstract execute(input: Record<string, unknown>): Promise<unknown>;
}
