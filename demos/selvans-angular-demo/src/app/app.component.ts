import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SelvansNodeDirective, SelvansTargetDirective, SelvansPanelComponent } from 'selvans-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SelvansNodeDirective, SelvansTargetDirective, SelvansPanelComponent],
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .sidebar {
      width: var(--nav-width);
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 0;
      position: fixed;
      top: 0; left: 0;
      height: 100vh;
    }
    .sidebar-brand {
      padding: 20px 16px 16px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-brand h1 { font-size: 15px; font-weight: 700; color: var(--primary); letter-spacing: -0.3px; }
    .sidebar-brand span { font-size: 11px; color: var(--text-muted); }
    nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
    nav a {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: var(--radius);
      font-size: 14px; color: var(--text-muted); transition: all 0.15s;
    }
    nav a:hover { background: var(--bg); color: var(--text); }
    nav a.active { background: #eef2ff; color: var(--primary); font-weight: 500; }
    .sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--border); }
    .content { margin-left: var(--nav-width); flex: 1; padding: 32px; }
  `],
  template: `
    <div class="layout" [SelvansNode]="{ id: 'app-layout', template: 'layout', description: 'Application layout — sidebar nav + main content' }">

      <aside class="sidebar">
        <div class="sidebar-brand">
          <h1>selvans</h1>
          <span>angular demo</span>
        </div>

        <nav [SelvansNode]="{ id: 'main-nav', template: 'nav', description: 'Main navigation links' }">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
             [SelvansNode]="{ id: 'nav-home', template: 'component', description: 'Navigate to home / overview', actions: ['click'] }"
             [SelvansTarget]="'nav-home'">
            <span>🏠</span> Home
          </a>
          <a routerLink="/projects" routerLinkActive="active"
             [SelvansNode]="{ id: 'nav-projects', template: 'component', description: 'Navigate to projects list', actions: ['click'] }"
             [SelvansTarget]="'nav-projects'">
            <span>📁</span> Projects
          </a>
          <a routerLink="/tasks" routerLinkActive="active"
             [SelvansNode]="{ id: 'nav-tasks', template: 'component', description: 'Navigate to tasks list', actions: ['click'] }"
             [SelvansTarget]="'nav-tasks'">
            <span>✅</span> Tasks
          </a>
        </nav>

        <div class="sidebar-footer">
          <selvans-panel />
        </div>
      </aside>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {}
