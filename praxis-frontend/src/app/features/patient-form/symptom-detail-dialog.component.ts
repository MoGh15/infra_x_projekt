import {Component, inject, Inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { SYMPTOM_DURATION_OPTIONS, SymptomConfig } from '../../shared/symptoms/symptom-catalog';
import { SymptomDetail } from '../../core/api/submission-create.model';

type SymptomDialogData = {
  config: SymptomConfig;
  value?: SymptomDetail | null;
};

@Component({
  selector: 'app-symptom-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatChipsModule,
  ],
  templateUrl: './symptom-detail-dialog.component.html',
  styleUrls: ['./symptom-detail-dialog.component.scss'],
})
export class SymptomDetailDialogComponent {
  config: SymptomConfig;
  durationOptions = SYMPTOM_DURATION_OPTIONS;
  private fb = inject(FormBuilder);

  form = this.fb.group({
    option: this.fb.control<string | null>(null),
    severity: this.fb.nonNullable.control(5),
    onset: this.fb.control<string | null>(null),
    notes: this.fb.control<string | null>(null),
  });

  constructor(
    private dialogRef: MatDialogRef<SymptomDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SymptomDialogData
  ) {
    this.config = data.config;
    if (data.value) {
      this.form.patchValue({
        option: data.value.option ?? null,
        severity: data.value.severity ?? 5,
        onset: data.value.onset ?? null,
        notes: data.value.notes ?? null,
      });
    }
  }

  cancel() {
    this.dialogRef.close(null);
  }

  save() {
    const value = this.form.getRawValue();
    const payload: SymptomDetail = {
      key: this.config.key,
      label: this.config.label,
      option: value.option,
      severity: value.severity,
      onset: value.onset,
      notes: value.notes,
    };
    this.dialogRef.close(payload);
  }
}
