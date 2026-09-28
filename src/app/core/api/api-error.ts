import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns a failed HTTP call into a message that is safe to show to a user.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'Cannot reach the API. Check that the backend is running and try again.';
  }

  if (error.status === 404) {
    return 'That user no longer exists. It may have been deleted somewhere else.';
  }

  return fallback;
}
