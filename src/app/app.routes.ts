import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    // The whole users feature is lazy by default
    path: 'users',
    loadChildren: () =>
      import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () =>
      import('./shared/not-found/not-found').then((m) => m.NotFound),
  },
];
