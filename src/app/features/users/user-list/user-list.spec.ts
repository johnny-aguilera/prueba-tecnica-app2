import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_CONFIG, ApiConfig } from '../../../core/api/api.config';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { UserList } from './user-list';

const users: User[] = [
  {
    id: 1,
    username: 'john.doe',
    name: 'John',
    surnames: 'Doe',
    email: 'john.doe@example.com',
    age: 32,
    active: true,
    lastLogging: '2026-09-20T10:30:00Z',
    creationDate: '2026-01-10T09:00:00Z',
  },
  {
    id: 2,
    username: 'jane.smith',
    name: 'Jane',
    surnames: 'Smith',
    email: 'jane.smith@example.com',
    age: 28,
    active: false,
    lastLogging: null,
    creationDate: '2026-02-15T11:20:00Z',
  },
];

/** Records the notifications a test triggered, without rendering a snack bar. */
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

/** Confirmation dialog stand-in: returns whatever the test asked it to return. */
class DialogStub {
  confirmed: boolean | undefined = true;
  openCount = 0;

  open(): { afterClosed: () => Observable<boolean | undefined> } {
    this.openCount++;
    return { afterClosed: () => of(this.confirmed) };
  }
}

describe('UserList', () => {
  let fixture: ComponentFixture<UserList>;
  let http: HttpTestingController;
  let dialog: DialogStub;
  let notifications: NotificationRecorder;

  beforeEach(() => {
    dialog = new DialogStub();
    notifications = new NotificationRecorder();

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
        { provide: MatDialog, useValue: dialog },
        { provide: NotificationService, useValue: notifications },
      ],
    });

    fixture = TestBed.createComponent(UserList);
    http = TestBed.inject(HttpTestingController);
  });

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  it('should show a loading state while the request is in flight', () => {
    fixture.detectChanges();

    expect(text()).toContain('Loading users');
    http.expectOne('/api/users').flush(users);
  });

  it('should render the users returned by the API', async () => {
    fixture.detectChanges();
    http.expectOne('/api/users').flush(users);
    await fixture.whenStable();

    expect(text()).toContain('john.doe');
    expect(text()).toContain('Jane Smith');
    expect(text()).toContain('1 active of 2 users');
    // A user that never logged in must not render an empty cell.
    expect(text()).toContain('Never');
  });

  it('should show an empty state when the API returns no users', async () => {
    fixture.detectChanges();
    http.expectOne('/api/users').flush([]);
    await fixture.whenStable();

    expect(text()).toContain('No users found.');
  });

  it('should show a retryable error when the request fails', async () => {
    fixture.detectChanges();
    http
      .expectOne('/api/users')
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(text()).toContain('Unable to load users.');

    const retry = fixture.nativeElement.querySelector('.users__state--error button');
    retry.click();
    http.expectOne('/api/users').flush(users);
    await fixture.whenStable();

    expect(text()).toContain('john.doe');
  });

  it('should filter the table without calling the API again', async () => {
    fixture.detectChanges();
    http.expectOne('/api/users').flush(users);
    await fixture.whenStable();

    const search: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    search.value = 'jane';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(text()).toContain('jane.smith');
    expect(text()).not.toContain('john.doe');
    expect(text()).toContain('Showing 1 of 2');
    http.verify();
  });

  it('should delete a user once the dialog is confirmed', async () => {
    fixture.detectChanges();
    http.expectOne('/api/users').flush(users);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.users__delete').click();
    http.expectOne({ method: 'DELETE', url: '/api/users/1' }).flush(null);
    await fixture.whenStable();

    expect(dialog.openCount).toBe(1);
    expect(text()).not.toContain('john.doe');
    expect(notifications.successes).toEqual(['john.doe was deleted.']);
  });

  it('should keep the user and report the failure when the delete request fails', async () => {
    fixture.detectChanges();
    http.expectOne('/api/users').flush(users);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.users__delete').click();
    http
      .expectOne({ method: 'DELETE', url: '/api/users/1' })
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await fixture.whenStable();

    expect(text()).toContain('john.doe');
    expect(notifications.errors).toEqual(['Unable to delete john.doe. Please try again.']);
  });

  it('should not call the API when the dialog is dismissed', async () => {
    dialog.confirmed = undefined;

    fixture.detectChanges();
    http.expectOne('/api/users').flush(users);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('.users__delete').click();
    await fixture.whenStable();

    http.verify();
    expect(text()).toContain('john.doe');
  });
});
