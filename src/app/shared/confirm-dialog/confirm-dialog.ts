import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  protected readonly dialogRef = inject(MatDialogRef<ConfirmDialog, boolean>);
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
