import { Environment } from './environment.model';

/**
 * Development environment.
 *
 * `/api` is proxied to the local mock REST API (see `proxy.conf.json`), so the
 * browser only ever talks to the Angular dev server origin.
 */
export const environment: Environment = {
  apiBaseUrl: '/api',
};
