import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../api/api.config';
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly usersUrl = `${this.config.baseUrl}/users`;

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl);
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(this.userUrl(id));
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.usersUrl, request);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(this.userUrl(id), request);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(this.userUrl(id));
  }

  private userUrl(id: number): string {
    return `${this.usersUrl}/${encodeURIComponent(id)}`;
  }
}
