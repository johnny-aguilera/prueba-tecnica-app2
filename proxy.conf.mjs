/**
 * Dev-server proxy: `/api/**` -> the local mock REST API.
 *
 *   http://localhost:4200/api/users  ->  http://localhost:3000/users
 *
 * The app therefore only ever calls same-origin URLs (`/api/...`), which keeps
 * CORS out of the picture in development and lets the same code hit a real
 * backend behind a reverse proxy in production.
 */
export default {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    secure: false,
    // The mock exposes plain REST resources (`/users`), so strip the `/api` prefix.
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};
