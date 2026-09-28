/**
 * Mock-only middleware: keeps server-owned behaviour on the server.
 *
 * `json-server` stores request bodies verbatim, so without this the Angular app
 * would have to invent `creationDate` itself — backend work leaking into the
 * frontend. Two rules are enforced here instead:
 *
 *  1. No request body is ever persisted with a `password` field. The mock keeps
 *     its database as readable JSON, so it must never hold a credential, even
 *     if a client sends one by mistake.
 *  2. `POST /users` stamps `creationDate` and starts `lastLogging` as `null`,
 *     the way a real API would.
 *
 * Delete this file together with the rest of `mock/` once the real backend
 * (Application 1) is available.
 */
module.exports = (req, res, next) => {
  const body = req.body;
  const hasBody = body !== null && typeof body === 'object';

  if (hasBody && 'password' in body) {
    delete body.password;
  }

  if (hasBody && req.method === 'POST' && req.path === '/users') {
    body.creationDate = new Date().toISOString();
    body.lastLogging = null;
  }

  next();
};
