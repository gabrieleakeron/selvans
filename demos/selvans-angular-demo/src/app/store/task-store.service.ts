import { Injectable, signal, computed } from '@angular/core';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
  projectId: string | null;
  createdAt: string;
  completedAt: string | null;
}

const now = new Date().toISOString();

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private _projects = signal<Project[]>([
    { id: 'proj-1', name: 'Website Redesign', description: 'Full redesign of the company website', createdAt: now },
    { id: 'proj-2', name: 'Mobile App', description: 'iOS and Android app', createdAt: now },
  ]);

  private _tasks = signal<Task[]>([
    { id: 'task-1', title: 'Design mockups', description: 'Create Figma mockups', status: 'pending', priority: 'high', projectId: 'proj-1', createdAt: now, completedAt: null },
    { id: 'task-2', title: 'Setup CI/CD', description: 'Configure GitHub Actions', status: 'completed', priority: 'medium', projectId: 'proj-1', createdAt: now, completedAt: now },
    { id: 'task-3', title: 'Write unit tests', description: '', status: 'pending', priority: 'low', projectId: null, createdAt: now, completedAt: null },
    { id: 'task-4', title: 'API design', description: 'Define REST endpoints', status: 'pending', priority: 'high', projectId: 'proj-2', createdAt: now, completedAt: null },
  ]);

  readonly projects = this._projects.asReadonly();
  readonly tasks = this._tasks.asReadonly();

  readonly stats = computed(() => {
    const tasks = this._tasks();
    return {
      totalProjects: this._projects().length,
      totalTasks: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      high: tasks.filter(t => t.priority === 'high').length,
    };
  });

  createProject(name: string, description = ''): Project {
    const project: Project = {
      id: 'proj-' + Math.random().toString(36).slice(2, 7),
      name, description,
      createdAt: new Date().toISOString(),
    };
    this._projects.update(ps => [...ps, project]);
    return project;
  }

  createTask(title: string, priority: Task['priority'] = 'medium', projectId: string | null = null): Task {
    const task: Task = {
      id: 'task-' + Math.random().toString(36).slice(2, 7),
      title, description: '',
      status: 'pending', priority, projectId,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this._tasks.update(ts => [...ts, task]);
    return task;
  }

  completeTask(id: string): void {
    this._tasks.update(ts =>
      ts.map(t => t.id === id ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t)
    );
  }

  deleteTask(id: string): void {
    this._tasks.update(ts => ts.filter(t => t.id !== id));
  }
}
