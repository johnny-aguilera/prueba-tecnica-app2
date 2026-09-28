import { Environment } from './environment.model';

/**
 * Production environment — this is the file to edit when the real backend
 * (Application 1) replaces the development mock.
 *
 * `/api` assumes the API is served from the same origin as the app (reverse
 * proxy or API gateway). Point `apiBaseUrl` at an absolute URL such as
 * `https://api.example.com` when it is not, and remember to enable CORS there.
 */
export const environment: Environment = {
  apiBaseUrl: '/api',
};
