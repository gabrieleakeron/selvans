import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SelvansNodeDirective, SelvansTargetDirective } from 'selvans-angular';
import { TaskStoreService } from '../../store/task-store.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SelvansNodeDirective, SelvansTargetDirective],
  styles: [`
    .page-header { margin-bottom: 28px; }
    .page-header h2 { font-size: 22px; font-weight: 700; }
    .page-header p { color: var(--text-muted); margin-top: 4px; font-size: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px 16px;
      box-shadow: var(--shadow);
    }
    .stat-card .label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 32px; font-weight: 700; margin-top: 4px; color: var(--primary); }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn-primary {
      background: var(--primary); color: #fff; border: none;
      padding: 10px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 500;
      transition: background 0.15s;
    }
    .btn-primary:hover { background: var(--primary-hover); }
  `],
  template: `
    <div [SelvansNode]="{ id: 'home-page', template: 'page', route: '/', description: 'Home overview page with project and task stats' }">
      <div class="page-header">
        <h2>Overview</h2>
        <p>selvans angular demo — task management</p>
      </div>

      <div class="stats-grid"
           [SelvansNode]="{ id: 'stats-widget', template: 'widget', description: 'Summary stats: total projects, tasks by status and priority' }">
        <div class="stat-card">
          <div class="label">Projects</div>
          <div class="value">{{ store.stats().totalProjects }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Total Tasks</div>
          <div class="value">{{ store.stats().totalTasks }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Pending</div>
          <div class="value" style="color: var(--warning)">{{ store.stats().pending }}</div>
        </div>
        <div class="stat-card">
          <div class="label">Completed</div>
          <div class="value" style="color: var(--success)">{{ store.stats().completed }}</div>
        </div>
        <div class="stat-card">
          <div class="label">High Priority</div>
          <div class="value" style="color: var(--danger)">{{ store.stats().high }}</div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" routerLink="/tasks"
                [SelvansNode]="{ id: 'go-to-tasks', template: 'component', description: 'Go to tasks list', actions: ['click'] }"
                [SelvansTarget]="'go-to-tasks'">
          View Tasks
        </button>
        <button class="btn-primary" routerLink="/projects"
                style="background: #0284c7"
                [SelvansNode]="{ id: 'go-to-projects', template: 'component', description: 'Go to projects list', actions: ['click'] }"
                [SelvansTarget]="'go-to-projects'">
          View Projects
        </button>
      </div>
    </div>
  `,
})
export class HomeComponent {
  protected store = inject(TaskStoreService);
}
