import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { API_CONFIG, ApiConfig } from '../../../core/api/api.config';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { UserForm } from './user-form';

const existingUser: User = {
  id: 1,
  username: 'john.doe',
  name: 'John',
  surnames: 'Doe',
  email: 'john.doe@example.com',
  age: 32,
  active: true,
  lastLogging: '2026-09-20T10:30:00Z',
  creationDate: '2026-01-10T09:00:00Z',
};

const validValues = {
  username: 'new.user',
  name: 'New',
  surnames: 'User',
  email: 'new.user@example.com',
  age: 30,
  active: true,
};

class NotificationRecorder {
  readonly successes: string[] = [];
  readonly errors: string[] = [];

  success(message: string): void {
    this.successes.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }
}

interface Harness {
  fixture: ComponentFixture<UserForm>;
  http: HttpTestingController;
  notifications: NotificationRecorder;
  navigate: ReturnType<typeof vi.fn>;
  text: () => string;
}

/** `id` is `null` for the create route and a route parameter for the edit route. */
function setup(id: string | null): Harness {
  const notifications = new NotificationRecorder();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: API_CONFIG,
        useValue: { baseUrl: '/api' } satisfies ApiConfig,
      },
      { provide: NotificationService, useValue: notifications },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } },
      },
    ],
  });

  const fixture = TestBed.createComponent(UserForm);
  // The real Router is kept so `routerLink` still resolves; only navigation is captured.
  const navigate = vi.fn().mockResolvedValue(true);
  vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);

  return {
    fixture,
    http: TestBed.inject(HttpTestingController),
    notifications,
    navigate,
    text: () => fixture.nativeElement.textContent as string,
  };
}

function submit(fixture: ComponentFixture<UserForm>): void {
  const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
  form.dispatchEvent(new Event('submit'));
}

describe('UserForm', () => {
  describe('create mode', () => {
    it('should render the create labels and require a password', async () => {
      const { fixture, text } = setup(null);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(text()).toContain('Create user');
      expect(fixture.componentInstance['form'].controls.password.hasError('required')).toBe(true);
    });

    it('should not call the API while the form is invalid', async () => {
      const { fixture, http, text } = setup(null);
      fixture.detectChanges();
      await fixture.whenStable();

      submit(fixture);
      await fixture.whenStable();

      http.verify();
      expect(text()).toContain('Review the highlighted fields before saving.');
    });

    it('should post the form values and return to the list', async () => {
      const { fixture, http, notifications, navigate } = setup(null);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance['form'].setValue({ ...validValues, password: 'super-secret' });
      submit(fixture);
      await fixture.whenStable();

      const request = http.expectOne({ method: 'POST', url: '/api/users' });
      // Server-owned fields are never sent by the client.
      expect(request.request.body).toEqual(validValues);
      request.flush({ ...existingUser, ...validValues });
      await fixture.whenStable();

      expect(notifications.successes).toEqual(['new.user was created.']);
      expect(navigate).toHaveBeenCalledWith(['/users']);
    });

    it('should report a failed create and stay on the form', async () => {
      const { fixture, http, notifications, navigate } = setup(null);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance['form'].setValue({ ...validValues, password: 'super-secret' });
      submit(fixture);
      await fixture.whenStable();

      http
        .expectOne({ method: 'POST', url: '/api/users' })
        .flush('boom', { status: 500, statusText: 'Internal Server Error' });
      await fixture.whenStable();

      expect(notifications.errors).toEqual(['Unable to create the user. Please try again.']);
      expect(navigate).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });
  });

  describe('edit mode', () => {
    it('should load the user and fill the form', async () => {
      const { fixture, http, text } = setup('1');
      fixture.detectChanges();

      http.expectOne({ method: 'GET', url: '/api/users/1' }).flush(existingUser);
      await fixture.whenStable();

      expect(text()).toContain('Edit user');
      expect(text()).toContain('Save changes');
      expect(fixture.componentInstance['form'].getRawValue()).toEqual({
        username: 'john.doe',
        name: 'John',
        surnames: 'Doe',
        email: 'john.doe@example.com',
        age: 32,
        active: true,
        password: '',
      });
      // An untouched password must not block saving.
      expect(fixture.componentInstance['form'].valid).toBe(true);
    });

    it('should put the full representation, keeping the server-owned fields', async () => {
      const { fixture, http, notifications, navigate } = setup('1');
      fixture.detectChanges();
      http.expectOne({ method: 'GET', url: '/api/users/1' }).flush(existingUser);
      await fixture.whenStable();

      fixture.componentInstance['form'].patchValue({ age: 33, active: false });
      submit(fixture);
      await fixture.whenStable();

      const request = http.expectOne({ method: 'PUT', url: '/api/users/1' });
      expect(request.request.body).toEqual({ ...existingUser, age: 33, active: false });
      request.flush({ ...existingUser, age: 33, active: false });
      await fixture.whenStable();

      expect(notifications.successes).toEqual(['john.doe was updated.']);
      expect(navigate).toHaveBeenCalledWith(['/users']);
    });

    it('should show a message when the user cannot be loaded', async () => {
      const { fixture, http, text } = setup('999');
      fixture.detectChanges();

      http
        .expectOne({ method: 'GET', url: '/api/users/999' })
        .flush(null, { status: 404, statusText: 'Not Found' });
      await fixture.whenStable();

      expect(text()).toContain('That user no longer exists.');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('should reject a route id that is not a user id', async () => {
      const { fixture, http, text } = setup('not-a-number');
      fixture.detectChanges();
      await fixture.whenStable();

      http.verify();
      expect(text()).toContain('is not a valid user id.');
    });
  });
});
