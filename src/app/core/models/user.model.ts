/**
 * A user exactly as the REST API returns it.
 */
export interface User {
  readonly id: number;
  username: string;
  name: string;
  surnames: string;
  email: string;
  age: number;
  active: boolean;
  /** ISO 8601 timestamp of the last successful login, or `null` if the user never logged in. */
  lastLogging: string | null;
  /** ISO 8601 timestamp stamped by the backend when the user is created. */
  creationDate: string;
}

/** The subset of a user the create/edit form is responsible for. */
export type UserFormFields = Pick<
  User,
  'username' | 'name' | 'surnames' | 'email' | 'age' | 'active'
>;

/**
 * Body of `POST /users`.
 *
 * `password` is optional because the form omits it when the field is left
 * empty, which on edit means "keep the current password".
 */
export interface CreateUserRequest extends UserFormFields {
  password?: string;
}

/**
 * Body of `PUT /users/:id`.
 *
 * `PUT` replaces the stored resource, so the full representation is sent back —
 * including the server-owned fields the form did not touch.
 */
export interface UpdateUserRequest extends User {
  password?: string;
}
