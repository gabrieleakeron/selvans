import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BaseTool } from './base-tool';

/** Returns the current page URL, title, and visible text */
@Injectable({ providedIn: 'root' })
export class GetPageStateTool extends BaseTool {
  readonly name = 'get_page_state';
  readonly description = 'Returns the current page URL, title, and visible text content';
  readonly inputSchema = { type: 'object' as const, properties: {}, required: [] };

  execute(_input: Record<string, unknown>): Promise<unknown> {
    return Promise.resolve({
      url: window.location.href,
      title: document.title,
      visibleText: document.body.innerText.slice(0, 5000),
    });
  }
}

/** Navigates to an Angular route */
@Injectable({ providedIn: 'root' })
export class NavigateTool extends BaseTool {
  readonly name = 'navigate';
  readonly description = 'Navigate to a route within the Angular application';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'The route path to navigate to' },
    },
    required: ['path'],
  };

  constructor(private router: Router) {
    super();
  }

  async execute(input: Record<string, unknown>): Promise<unknown> {
    const path = input['path'] as string;
    const success = await this.router.navigateByUrl(path);
    return { success, path };
  }
}

/** Lists elements marked with the SelvansTarget directive */
@Injectable({ providedIn: 'root' })
export class GetElementsTool extends BaseTool {
  readonly name = 'get_elements';
  readonly description = 'Returns all elements tagged with the SelvansTarget directive';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      selector: {
        type: 'string',
        description: 'Optional CSS selector to narrow results (default: all selvans targets)',
      },
    },
  };

  execute(input: Record<string, unknown>): Promise<unknown> {
    const sel = (input['selector'] as string) || '[data-selvans]';
    const elements = Array.from(document.querySelectorAll(sel)).map((el) => ({
      id: el.getAttribute('data-selvans'),
      tag: el.tagName.toLowerCase(),
      text: (el as HTMLElement).innerText?.slice(0, 200),
      visible: (el as HTMLElement).offsetParent !== null,
    }));
    return Promise.resolve({ elements });
  }
}

/** Clicks an element tagged with SelvansTarget */
@Injectable({ providedIn: 'root' })
export class ClickElementTool extends BaseTool {
  readonly name = 'click_element';
  readonly description = 'Clicks an element tagged with the SelvansTarget directive';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      targetId: { type: 'string', description: 'The SelvansTarget id of the element to click' },
    },
    required: ['targetId'],
  };

  execute(input: Record<string, unknown>): Promise<unknown> {
    const targetId = input['targetId'] as string;
    const el = document.querySelector(`[data-selvans="${targetId}"]`) as HTMLElement | null;
    if (!el) {
      return Promise.resolve({ success: false, error: `Element "${targetId}" not found` });
    }
    el.click();
    return Promise.resolve({ success: true, targetId });
  }
}

/** Reads or sets the value of a form input tagged with SelvansTarget */
@Injectable({ providedIn: 'root' })
export class FormInputTool extends BaseTool {
  readonly name = 'form_input';
  readonly description = 'Reads or sets the value of a form field tagged with SelvansTarget';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      targetId: { type: 'string', description: 'The SelvansTarget id of the input' },
      value: { type: 'string', description: 'Value to set. Omit to only read the current value.' },
    },
    required: ['targetId'],
  };

  execute(input: Record<string, unknown>): Promise<unknown> {
    const targetId = input['targetId'] as string;
    const el = document.querySelector(`[data-selvans="${targetId}"]`) as HTMLInputElement | null;
    if (!el) {
      return Promise.resolve({ success: false, error: `Element "${targetId}" not found` });
    }
    if ('value' in input) {
      el.value = input['value'] as string;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return Promise.resolve({ success: true, targetId, value: el.value });
  }
}
