import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelvansNodeDirective, SelvansTargetDirective } from 'selvans-angular';
import { TaskStoreService } from '../../store/task-store.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [FormsModule, SelvansNodeDirective, SelvansTargetDirective],
  styles: [`
    .page-header { margin-bottom: 28px; }
    .page-header h2 { font-size: 22px; font-weight: 700; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 12px; }
    .project-list { display: flex; flex-direction: column; gap: 10px; }
    .project-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow);
    }
    .project-card h3 { font-size: 15px; font-weight: 600; }
    .project-card p { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .form-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow);
      max-width: 480px;
    }
    .form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    label { font-size: 13px; font-weight: 500; }
    input, textarea {
      border: 1px solid var(--border); border-radius: 6px;
      padding: 8px 10px; font-size: 14px; width: 100%;
      transition: border 0.15s;
    }
    input:focus, textarea:focus { outline: none; border-color: var(--primary); }
    textarea { resize: vertical; min-height: 72px; }
    .btn-primary {
      background: var(--primary); color: #fff; border: none;
      padding: 9px 20px; border-radius: var(--radius); font-size: 14px; font-weight: 500;
    }
    .btn-primary:hover { background: var(--primary-hover); }
    .empty { color: var(--text-muted); font-size: 14px; font-style: italic; padding: 12px 0; }
  `],
  template: `
    <div [SelvansNode]="{ id: 'projects-page', template: 'page', route: '/projects', description: 'Projects list and create project form' }">

      <div class="page-header">
        <h2>Projects</h2>
      </div>

      <div class="section">
        <div class="section-title">All projects</div>
        <div class="project-list"
             [SelvansNode]="{ id: 'projects-list', template: 'list', description: 'List of all projects' }">
          @for (project of store.projects(); track project.id) {
            <div class="project-card"
                 [SelvansNode]="{ id: 'project-' + project.id, template: 'component', description: 'Project: ' + project.name, actions: ['read'] }"
                 [SelvansTarget]="'project-' + project.id">
              <h3>{{ project.name }}</h3>
              <p>{{ project.description || 'No description' }}</p>
            </div>
          } @empty {
            <p class="empty">No projects yet.</p>
          }
        </div>
      </div>

      <div class="section">
        <div class="section-title">New project</div>
        <form class="form-card" (ngSubmit)="submit()"
              [SelvansNode]="{ id: 'create-project-form', template: 'form', description: 'Create a new project — fields: name, description' }">
          <div class="form-row">
            <label for="proj-name">Name *</label>
            <input id="proj-name" type="text" [(ngModel)]="name" name="name" placeholder="Project name" required
                   [SelvansTarget]="'project-name-input'"
                   [SelvansNode]="{ id: 'project-name-input', template: 'component', description: 'Project name input', actions: ['fill', 'read'] }" />
          </div>
          <div class="form-row">
            <label for="proj-desc">Description</label>
            <textarea id="proj-desc" [(ngModel)]="description" name="description" placeholder="Optional description"
                      [SelvansTarget]="'project-description-input'"
                      [SelvansNode]="{ id: 'project-description-input', template: 'component', description: 'Project description input', actions: ['fill', 'read'] }"></textarea>
          </div>
          <button type="submit" class="btn-primary"
                  [SelvansNode]="{ id: 'create-project-btn', template: 'component', description: 'Submit create project form', actions: ['click'] }"
                  [SelvansTarget]="'create-project-btn'">
            Create Project
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ProjectsComponent {
  protected store = inject(TaskStoreService);
  protected name = '';
  protected description = '';

  protected submit(): void {
    if (!this.name.trim()) return;
    this.store.createProject(this.name.trim(), this.description.trim());
    this.name = '';
    this.description = '';
  }
}
