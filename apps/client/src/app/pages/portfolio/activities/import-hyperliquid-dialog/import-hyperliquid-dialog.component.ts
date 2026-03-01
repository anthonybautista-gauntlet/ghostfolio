import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import ms from 'ms';

@Component({
  imports: [
    CommonModule,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-import-hyperliquid-dialog',
  styleUrls: ['./import-hyperliquid-dialog.scss'],
  templateUrl: './import-hyperliquid-dialog.html'
})
export class GfImportHyperliquidDialogComponent {
  public isLoading = false;
  public readonly dialogTitle = $localize`Import Hyperliquid`;
  public readonly form = this.formBuilder.group({
    fromDate: [null as Date | null],
    fromTime: ['00:00'],
    includeLedger: [true],
    toDate: [null as Date | null],
    toTime: ['23:59'],
    walletAddress: [
      '',
      [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)]
    ]
  });

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: { deviceType: string },
    private dataService: DataService,
    private dialogRef: MatDialogRef<
      GfImportHyperliquidDialogComponent,
      boolean
    >,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  public onCancel() {
    this.dialogRef.close(false);
  }

  public onImport() {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
      return;
    }

    const { fromDate, fromTime, includeLedger, toDate, toTime, walletAddress } =
      this.form.getRawValue();
    this.isLoading = true;

    this.dataService
      .postHyperliquidImport({
        from: this.toIsoDateTime({ date: fromDate, time: fromTime }),
        includeLedger,
        to: this.toIsoDateTime({ date: toDate, time: toTime }),
        walletAddress
      })
      .subscribe({
        error: (error: HttpErrorResponse) => {
          const apiMessage = error?.error?.message;
          const message = Array.isArray(apiMessage)
            ? apiMessage.join('\n')
            : typeof apiMessage === 'string'
              ? apiMessage
              : $localize`Oops! Something went wrong. Please try again later.`;
          this.snackBar.open(message, $localize`Okay`, {
            duration: ms('5 seconds')
          });
          this.isLoading = false;
        },
        next: () => {
          this.snackBar.open(
            '✅ ' + $localize`Hyperliquid import completed`,
            undefined,
            {
              duration: ms('3 seconds')
            }
          );
          this.dialogRef.close(true);
        }
      });
  }

  private toIsoDateTime({
    date,
    time
  }: {
    date: Date | null;
    time: string | null;
  }) {
    if (!date) {
      return undefined;
    }

    const [hourString = '0', minuteString = '0'] = (time ?? '00:00').split(':');
    const normalizedDate = new Date(date);
    normalizedDate.setHours(Number(hourString), Number(minuteString), 0, 0);

    return normalizedDate.toISOString();
  }
}
