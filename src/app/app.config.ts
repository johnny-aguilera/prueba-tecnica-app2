import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { API_CONFIG, ApiConfig } from './core/api/api.config';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

const apiConfig: ApiConfig = {
  baseUrl: environment.apiBaseUrl,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withFetch()),
    { provide: API_CONFIG, useValue: apiConfig },
  ],
};
