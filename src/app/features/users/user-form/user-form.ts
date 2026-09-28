import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Observable } from 'rxjs';

import { apiErrorMessage } from '../../../core/api/api-error';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';

/** Minimum length required when a password is supplied. */
const PASSWORD_MIN_LENGTH = 8;

@Component({
  selector: 'app-user-form',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Validation and values stay in the reactive form; signals only carry UI state. */
  protected readonly form = this.fb.nonNullable.group({
    username: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
    ],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    surnames: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    // `minLength` ignores empty values, so this only applies once something is typed.
    password: ['', [Validators.minLength(PASSWORD_MIN_LENGTH)]],
    age: [0, [Validators.required, Validators.min(0), Validators.max(120)]],
    active: [true],
  });

  protected readonly isEditMode = signal(false);
  protected readonly loadingUser = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly currentUser = signal<User | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly pageTitle = computed(() => (this.isEditMode() ? 'Edit user' : 'Create user'));
  protected readonly submitLabel = computed(() =>
    this.isEditMode() ? 'Save changes' : 'Create user',
  );
  protected readonly passwordHint = computed(() =>
    this.isEditMode()
      ? 'Leave empty to keep the current password.'
      : `At least ${PASSWORD_MIN_LENGTH} characters.`,
  );
  /** The form is only rendered once there is something valid to edit. */
  protected readonly formReady = computed(
    () =>
      !this.loadingUser() &&
      this.loadError() === null &&
      (!this.isEditMode() || this.currentUser() !== null),
  );

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  /** `null` until an edit route supplies a usable id; a retry is only offered once it has one. */
  private readonly userId = signal<number | null>(null);
  protected readonly canRetry = computed(() => this.userId() !== null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam === null) {
      this.form.controls.password.addValidators(Validators.required);
      this.form.controls.password.updateValueAndValidity();
      return;
    }

    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      this.isEditMode.set(true);
      this.loadError.set(`"${idParam}" is not a valid user id.`);
      return;
    }

    this.userId.set(id);
    this.isEditMode.set(true);
    this.loadUser(id);
  }

  protected loadUser(id: number): void {
    this.loadingUser.set(true);
    this.loadError.set(null);

    this.userService.getUser(id).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.form.patchValue({
          username: user.username,
          name: user.name,
          surnames: user.surnames,
          email: user.email,
          age: user.age,
          active: user.active,
        });
        this.loadingUser.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(apiErrorMessage(error, 'Unable to load this user. Please try again.'));
        this.loadingUser.set(false);
      },
    });
  }

  protected retryLoad(): void {
    const id = this.userId();
    if (id !== null) {
      this.loadUser(id);
    }
  }

  protected save(): void {
    this.submitAttempted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.saving()) {
      return;
    }

    const request = this.buildRequest();
    if (request === null) {
      return;
    }

    this.saving.set(true);

    request.subscribe({
      next: (user) => {
        this.saving.set(false);
        this.notifications.success(
          this.isEditMode() ? `${user.username} was updated.` : `${user.username} was created.`,
        );
        void this.router.navigate(['/users']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(
          apiErrorMessage(
            error,
            this.isEditMode()
              ? 'Unable to save the changes. Please try again.'
              : 'Unable to create the user. Please try again.',
          ),
        );
      },
    });
  }

  private buildRequest(): Observable<User> | null {
    const { password, ...fields } = this.form.getRawValue();
    const credentials = password === '' ? {} : { password };

    if (!this.isEditMode()) {
      return this.userService.createUser({ ...fields, ...credentials });
    }

    const current = this.currentUser();
    const id = this.userId();
    if (current === null || id === null) {
      return null;
    }

    // `PUT` replaces the resource, so the server-owned fields are sent back untouched.
    return this.userService.updateUser(id, { ...current, ...fields, ...credentials });
  }
}
