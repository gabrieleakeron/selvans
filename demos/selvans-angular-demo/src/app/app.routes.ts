import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent) },
  { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks.component').then(m => m.TasksComponent) },
  { path: '**', redirectTo: '' },
];
