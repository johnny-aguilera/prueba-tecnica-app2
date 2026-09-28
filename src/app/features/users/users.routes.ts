import { Routes } from '@angular/router';

/**
 * Routes for the users feature
 */
export const USERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Users',
    loadComponent: () => import('./user-list/user-list').then((m) => m.UserList),
  },
  {
    path: 'new',
    title: 'Create user',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
  },
  {
    path: ':id/edit',
    title: 'Edit user',
    loadComponent: () => import('./user-form/user-form').then((m) => m.UserForm),
  },
];
