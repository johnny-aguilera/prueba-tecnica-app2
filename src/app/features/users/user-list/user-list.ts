import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/api-error';
import { User } from '../../../core/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-list',
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList implements OnInit {
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingUserId = signal<number | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly activeOnly = signal(false);

  protected readonly hasUsers = computed(() => this.users().length > 0);
  protected readonly activeUsers = computed(() =>
    this.users().filter((user) => user.active),
  );

  protected readonly visibleUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const activeOnly = this.activeOnly();

    return this.users().filter((user) => {
      if (activeOnly && !user.active) {
        return false;
      }
      if (term === '') {
        return true;
      }
      return `${user.username} ${user.name} ${user.surnames} ${user.email}`
        .toLowerCase()
        .includes(term);
    });
  });

  protected readonly filtersApplied = computed(
    () => this.searchTerm().trim() !== '' || this.activeOnly(),
  );

  protected readonly columns = [
    'username',
    'fullName',
    'email',
    'age',
    'status',
    'lastLogging',
    'creationDate',
    'actions',
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.users.set([]);
        this.error.set(
          apiErrorMessage(error, 'Unable to load users. Please try again.'),
        );
        this.loading.set(false);
      },
    });
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.activeOnly.set(false);
  }

  protected confirmDelete(user: User): void {
    const data: ConfirmDialogData = {
      title: 'Delete user',
      message: `${user.name} ${user.surnames} (${user.username}) will be permanently deleted.`,
      confirmLabel: 'Delete',
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '420px', autoFocus: 'dialog' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed === true) {
          this.deleteUser(user);
        }
      });
  }

  private deleteUser(user: User): void {
    this.deletingUserId.set(user.id);

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((users) =>
          users.filter((candidate) => candidate.id !== user.id),
        );
        this.deletingUserId.set(null);
        this.notifications.success(`${user.username} was deleted.`);
      },
      error: (error: unknown) => {
        this.deletingUserId.set(null);
        this.notifications.error(
          apiErrorMessage(
            error,
            `Unable to delete ${user.username}. Please try again.`,
          ),
        );
      },
    });
  }
}
