import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelvansNodeDirective, SelvansTargetDirective } from 'selvans-angular';
import { TaskStoreService, Task } from '../../store/task-store.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [FormsModule, SelvansNodeDirective, SelvansTargetDirective],
  styles: [`
    .page-header { margin-bottom: 28px; }
    .page-header h2 { font-size: 22px; font-weight: 700; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 12px; }
    .filter-bar {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 12px 16px; box-shadow: var(--shadow);
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .filter-bar label { font-size: 13px; font-weight: 500; }
    select {
      border: 1px solid var(--border); border-radius: 6px;
      padding: 6px 10px; font-size: 13px;
    }
    .task-list { display: flex; flex-direction: column; gap: 8px; }
    .task-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow);
      display: flex; align-items: center; gap: 12px;
    }
    .task-card.completed { opacity: 0.55; }
    .task-info { flex: 1; }
    .task-info .title { font-size: 14px; font-weight: 500; }
    .task-info .title.done { text-decoration: line-through; color: var(--text-muted); }
    .task-meta { display: flex; gap: 8px; margin-top: 4px; }
    .badge {
      font-size: 10px; font-weight: 600; padding: 2px 7px;
      border-radius: 999px; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .badge-high { background: #fee2e2; color: #b91c1c; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #dcfce7; color: #166534; }
    .badge-pending { background: #f1f5f9; color: var(--text-muted); }
    .badge-completed { background: #dcfce7; color: #166534; }
    .task-actions { display: flex; gap: 6px; }
    .btn-sm {
      border: none; padding: 5px 10px; border-radius: 5px;
      font-size: 12px; font-weight: 500;
    }
    .btn-complete { background: #dcfce7; color: #166534; }
    .btn-complete:hover { background: #bbf7d0; }
    .btn-delete { background: #fee2e2; color: #b91c1c; }
    .btn-delete:hover { background: #fecaca; }
    .form-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow);
      max-width: 480px;
    }
    .form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    label { font-size: 13px; font-weight: 500; }
    input, select {
      border: 1px solid var(--border); border-radius: 6px;
      padding: 8px 10px; font-size: 14px; width: 100%;
    }
    input:focus, select:focus { outline: none; border-color: var(--primary); }
    .btn-primary {
      background: var(--primary); color: #fff; border: none;
      padding: 9px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 500;
    }
    .btn-primary:hover { background: var(--primary-hover); }
    .empty { color: var(--text-muted); font-size: 14px; font-style: italic; padding: 12px 0; }
  `],
  template: `
    <div [SelvansNode]="{ id: 'tasks-page', template: 'page', route: '/tasks', description: 'Tasks list with filter and create task form' }">

      <div class="page-header">
        <h2>Tasks</h2>
      </div>

      <!-- Filter -->
      <div [SelvansNode]="{ id: 'tasks-filter', template: 'widget', description: 'Filter tasks by status: all, pending, completed' }">
        <div class="filter-bar">
          <label for="status-filter">Status:</label>
          <select id="status-filter" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)"
                  [SelvansTarget]="'status-filter'"
                  [SelvansNode]="{ id: 'status-filter', template: 'component', description: 'Filter tasks by status — values: all, pending, completed', actions: ['fill', 'read'] }">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <span style="font-size:13px; color: var(--text-muted)">{{ filteredTasks().length }} tasks</span>
        </div>
      </div>

      <!-- Task list -->
      <div class="section">
        <div class="task-list"
             [SelvansNode]="{ id: 'tasks-list', template: 'list', description: 'Filtered list of tasks' }">
          @for (task of filteredTasks(); track task.id) {
            <div class="task-card" [class.completed]="task.status === 'completed'"
                 [SelvansNode]="{ id: 'task-' + task.id, template: 'component', description: 'Task: ' + task.title + ' — status: ' + task.status + ', priority: ' + task.priority, actions: ['click', 'read'] }"
                 [SelvansTarget]="'task-' + task.id">
              <div class="task-info">
                <div class="title" [class.done]="task.status === 'completed'">{{ task.title }}</div>
                <div class="task-meta">
                  <span class="badge" [class.badge-high]="task.priority === 'high'" [class.badge-medium]="task.priority === 'medium'" [class.badge-low]="task.priority === 'low'">
                    {{ task.priority }}
                  </span>
                  <span class="badge" [class.badge-completed]="task.status === 'completed'" [class.badge-pending]="task.status === 'pending'">
                    {{ task.status }}
                  </span>
                </div>
              </div>
              <div class="task-actions">
                @if (task.status === 'pending') {
                  <button class="btn-sm btn-complete"
                          (click)="complete(task.id)"
                          [SelvansNode]="{ id: 'complete-' + task.id, template: 'component', description: 'Mark task ' + task.id + ' as completed', actions: ['click'] }"
                          [SelvansTarget]="'complete-' + task.id">
                    ✓ Done
                  </button>
                }
                <button class="btn-sm btn-delete"
                        (click)="delete(task.id)"
                        [SelvansNode]="{ id: 'delete-' + task.id, template: 'component', description: 'Delete task ' + task.id, actions: ['click'] }"
                        [SelvansTarget]="'delete-' + task.id">
                  ✕
                </button>
              </div>
            </div>
          } @empty {
            <p class="empty">No tasks match the current filter.</p>
          }
        </div>
      </div>

      <!-- Create form -->
      <div class="section">
        <div class="section-title">New task</div>
        <form class="form-card" (ngSubmit)="submit()"
              [SelvansNode]="{ id: 'create-task-form', template: 'form', description: 'Create a new task — fields: title, priority, project' }">
          <div class="form-row">
            <label for="task-title">Title *</label>
            <input id="task-title" type="text" [(ngModel)]="newTitle" name="title" placeholder="Task title" required
                   [SelvansTarget]="'task-title-input'"
                   [SelvansNode]="{ id: 'task-title-input', template: 'component', description: 'Task title input', actions: ['fill', 'read'] }" />
          </div>
          <div class="form-row">
            <label for="task-priority">Priority</label>
            <select id="task-priority" [(ngModel)]="newPriority" name="priority"
                    [SelvansTarget]="'task-priority-select'"
                    [SelvansNode]="{ id: 'task-priority-select', template: 'component', description: 'Task priority selector — values: high, medium, low', actions: ['fill', 'read'] }">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div class="form-row">
            <label for="task-project">Project</label>
            <select id="task-project" [(ngModel)]="newProjectId" name="projectId"
                    [SelvansTarget]="'task-project-select'"
                    [SelvansNode]="{ id: 'task-project-select', template: 'component', description: 'Task project selector — select a project or none', actions: ['fill', 'read'] }">
              <option value="">None</option>
              @for (p of store.projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
          <button type="submit" class="btn-primary"
                  [SelvansNode]="{ id: 'create-task-btn', template: 'component', description: 'Submit create task form', actions: ['click'] }"
                  [SelvansTarget]="'create-task-btn'">
            Create Task
          </button>
        </form>
      </div>
    </div>
  `,
})
export class TasksComponent {
  protected store = inject(TaskStoreService);

  protected statusFilter = signal<'all' | 'pending' | 'completed'>('all');

  protected filteredTasks = computed(() => {
    const f = this.statusFilter();
    const tasks = this.store.tasks();
    return f === 'all' ? tasks : tasks.filter((t: Task) => t.status === f);
  });

  protected newTitle = '';
  protected newPriority: Task['priority'] = 'medium';
  protected newProjectId = '';

  protected complete(id: string): void { this.store.completeTask(id); }
  protected delete(id: string): void { this.store.deleteTask(id); }

  protected submit(): void {
    if (!this.newTitle.trim()) return;
    this.store.createTask(this.newTitle.trim(), this.newPriority, this.newProjectId || null);
    this.newTitle = '';
    this.newPriority = 'medium';
    this.newProjectId = '';
  }
}
