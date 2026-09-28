import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_CONFIG, ApiConfig } from '../api/api.config';
import { User } from '../models/user.model';
import { UserService } from './user.service';

const existingUser: User = {
  id: 1,
  username: 'john.doe',
  name: 'John',
  surnames: 'Doe',
  email: 'john.doe@example.com',
  age: 32,
  active: true,
  lastLogging: null,
  creationDate: '2026-01-10T09:00:00Z',
};

function setup(config: Partial<ApiConfig> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: API_CONFIG,
        useValue: { baseUrl: '/api', ...config } satisfies ApiConfig,
      },
    ],
  });

  return {
    service: TestBed.inject(UserService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('UserService', () => {
  let http: HttpTestingController;
  let service: UserService;

  beforeEach(() => {
    ({ service, http } = setup());
  });

  afterEach(() => {
    http.verify();
  });

  it('should build every endpoint from the configured base URL', () => {
    service.getUsers().subscribe();
    http.expectOne({ method: 'GET', url: '/api/users' }).flush([existingUser]);

    service.getUser(7).subscribe();
    http.expectOne({ method: 'GET', url: '/api/users/7' }).flush(existingUser);

    service.deleteUser(7).subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/users/7' }).flush(null);
  });

  it('should return the users emitted by the API', () => {
    let received: User[] | undefined;
    service.getUsers().subscribe((users) => (received = users));

    http.expectOne('/api/users').flush([existingUser]);

    expect(received).toEqual([existingUser]);
  });

  it('should send the full representation on update, because PUT replaces the resource', () => {
    service.updateUser(1, { ...existingUser, age: 33 }).subscribe();

    const request = http.expectOne({ method: 'PUT', url: '/api/users/1' });
    expect(request.request.body).toEqual({ ...existingUser, age: 33 });
    request.flush({ ...existingUser, age: 33 });
  });

  it('should honour an absolute base URL, as used against a real backend', () => {
    ({ service, http } = setup({ baseUrl: 'https://api.example.com' }));

    service.getUsers().subscribe();

    http.expectOne({ method: 'GET', url: 'https://api.example.com/users' }).flush([]);
  });
});
