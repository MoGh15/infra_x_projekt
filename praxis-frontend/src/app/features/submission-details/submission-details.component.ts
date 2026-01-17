import {Component, computed, inject, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AdminSubmissionsService } from '../../core/api/admin-submissions.service';
import { Signature, SubmissionAttachment, SubmissionDetails, SubmissionStatus, SymptomDetail } from '../../core/api/submission.model';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {ConfirmDoneDialogComponent} from '../confirm-done-dialog/confirm-done-dialog.component';
import {FormArray, FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {of, switchMap} from 'rxjs';
import {MatCheckbox, MatCheckboxModule} from '@angular/material/checkbox';
import {MatInputModule} from '@angular/material/input';
import {SYMPTOM_CATALOG, SYMPTOM_DURATION_OPTIONS, SymptomConfig} from '../../shared/symptoms/symptom-catalog';

@Component({
  selector: 'app-submission-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,

    MatToolbarModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './submission-details.component.html',
  styleUrls: ['./submission-details.component.scss'],
})
export class SubmissionDetailsComponent {
  private fb = inject(FormBuilder);

  loading = signal(true);
  saving = signal(false);
  editing = signal(false);

  submission = signal<SubmissionDetails | null>(null);
  symptomCatalog = SYMPTOM_CATALOG;
  symptomDurationOptions = SYMPTOM_DURATION_OPTIONS;

  id = computed(() => this.route.snapshot.paramMap.get('id')!);

  // --- Form (Edit) ---
  form = this.fb.nonNullable.group({
    patientData: this.fb.nonNullable.group({
      firstName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
      lastName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),

      // als String im Format YYYY-MM-DD (weil du Backend auf String umgestellt hast)
      birthDate: this.fb.nonNullable.control('', [Validators.required]),

      phone: this.fb.nonNullable.control('', [
        Validators.pattern(/^[0-9+()\/\-\s]{6,20}$/),
      ]),
      email: this.fb.nonNullable.control('', [Validators.email]),

      address: this.fb.nonNullable.group({
        street: this.fb.nonNullable.control(''),
        houseNumber: this.fb.nonNullable.control(''),
        zip: this.fb.nonNullable.control('', [Validators.pattern(/^\d{5}$/)]),
        city: this.fb.nonNullable.control(''),
      }),
    }),

    medical: this.fb.nonNullable.group({
      allergies: this.fb.nonNullable.control<string[]>([]),
      medications: this.fb.nonNullable.control<string[]>([]),
      preExistingConditions: this.fb.nonNullable.control<string[]>([]),
      symptoms: this.fb.array([]),
    }),

    consents: this.fb.nonNullable.group({
      gdprAccepted: this.fb.nonNullable.control(false),
      dataSharingAccepted: this.fb.nonNullable.control(false),
    }),
  });

  // extra inputs für Listen
  extraAllergy = this.fb.nonNullable.control('');
  extraMedication = this.fb.nonNullable.control('');
  extraCondition = this.fb.nonNullable.control('');
  extraSymptom = this.fb.nonNullable.control('');

  // template helper
  pd = computed(() => this.form.controls.patientData.controls);
  addr = computed(() => this.form.controls.patientData.controls.address.controls);
  med = computed(() => this.form.controls.medical.controls);
  cons = computed(() => this.form.controls.consents.controls);
  get symptomControls() {
    return (this.form.controls.medical.controls.symptoms as FormArray).controls;
  }

  // Button aktiv wenn: nicht saving UND (Form dirty ODER Status != DONE)
  canMarkDone = computed(() => {
    const s = this.submission();
    if (!s) return false;
    if (this.saving()) return false;
    return this.form.dirty || s.status === 'DONE';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: AdminSubmissionsService,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.load();
  }

  load() {
    this.loading.set(true);

    this.api.getById(this.id()).subscribe({
      next: (data) => {
        this.submission.set(data);
        this.patchFormFromSubmission(data);
        this.form.markAsPristine();
        this.loading.set(false);

        // NEW -> VIEWED beim Öffnen
        if (data.status === 'NEW') {
          this.api.updateStatus(data.id, 'VIEWED').subscribe({
            next: () => this.submission.set({ ...data, status: 'VIEWED' }),
            error: () => {},
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Konnte Submission nicht laden', 'OK', { duration: 3000 });
      },
    });
  }

  back() {
    this.router.navigate(['/admin']);
  }

  startEdit() {
    const s = this.submission();
    if (!s) return;
    this.patchFormFromSubmission(s);
    this.form.markAsPristine();
    this.editing.set(true);
  }

  cancelEdit() {
    const s = this.submission();
    if (!s) return;
    this.patchFormFromSubmission(s);
    this.form.markAsPristine();
    this.editing.set(false);
  }

  // --- View helpers ---
  displayBirthDate(val?: string | null): string {
    if (!val) return '-';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return val;

    // ISO yyyy-mm-dd -> dd.mm.yyyy
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return val;
  }

  unique(list: string[]): string[] {
    return Array.from(new Set((list ?? []).map(x => (x ?? '').trim()).filter(Boolean)));
  }

  signatureDataUrl(signature?: Signature | null): string | null {
    if (!signature?.base64) return null;
    if (signature.base64.startsWith('data:')) return signature.base64;
    const contentType = signature.contentType || 'image/png';
    return `data:${contentType};base64,${signature.base64}`;
  }

  normalizeSymptoms(raw: any): SymptomDetail[] {
    if (!raw || !Array.isArray(raw)) return [];
    if (raw.length && typeof raw[0] === 'string') {
      return raw.map((label: string) => ({
        key: this.symptomCatalog.find(item => item.label.toLowerCase() === label.toLowerCase())?.key
          ?? label.toLowerCase().replace(/\s+/g, '-'),
        label,
        severity: null,
        onset: null,
        option: null,
        notes: null,
      }));
    }
    return raw as SymptomDetail[];
  }

  // --- Medical list editor helpers ---
  addExtra(ctrl: { value: string[]; setValue: (v: string[]) => void }, extraCtrl: { value: string; setValue: (v: string) => void }) {
    const raw = (extraCtrl.value ?? '').trim();
    if (!raw) return;

    const current = this.unique(ctrl.value ?? []);
    if (!current.includes(raw)) {
      ctrl.setValue([...current, raw]);
      this.form.markAsDirty();
    }
    extraCtrl.setValue('');
  }

  removeChip(ctrl: { value: string[]; setValue: (v: string[]) => void }, item: string) {
    const current = (ctrl.value ?? []).filter(x => x !== item);
    ctrl.setValue(current);
    this.form.markAsDirty();
  }

  removeSymptom(index: number) {
    (this.form.controls.medical.controls.symptoms as FormArray).removeAt(index);
    this.form.markAsDirty();
  }

  addCustomSymptom() {
    const raw = (this.extraSymptom.value ?? '').trim();
    if (!raw) return;

    const arr = this.form.controls.medical.controls.symptoms as FormArray;
    const exists = arr.controls.some(ctrl => (ctrl as any).value?.label?.toLowerCase() === raw.toLowerCase());
    if (exists) {
      this.extraSymptom.setValue('');
      return;
    }

    const key = `custom-${Date.now()}`;
    arr.push(this.createSymptomGroup({ key, label: raw, icon: 'healing' }));
    this.extraSymptom.setValue('');
    this.form.markAsDirty();
  }

  symptomConfig(key: string) {
    return this.symptomCatalog.find(item => item.key === key) ?? { key, label: key, icon: 'healing' };
  }

  markDone() {
    const s = this.submission();
    if (!s) return;

    // wenn Edit-Modus + ungültig
    if (this.editing() && this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Bitte Pflichtfelder/Validierungen prüfen.', 'OK', { duration: 2500 });
      return;
    }

    const isAlreadyDone = s.status === 'DONE';
    const hasChanges = this.form.dirty;

    if (!hasChanges && isAlreadyDone) {
      this.snack.open('Keine Änderungen zu speichern.', 'OK', { duration: 2000 });
      return;
    }

    // Dialog IMMER zeigen (wenn dirty), nur Mode wechselt
    const ref = this.dialog.open(ConfirmDoneDialogComponent, {
      panelClass: 'amber-dialog',
      data: { mode: isAlreadyDone ? 'SAVE_ONLY' : 'MARK_DONE' },
    });

    ref.afterClosed()
      .pipe(
        switchMap((ok: boolean) => {
          if (!ok) return of(null);

          this.saving.set(true);
          const payload = this.form.getRawValue();

          // 1) immer speichern (weil dirty)
          const save$ = this.api.update(s.id, {
            patientData: payload.patientData,
            medical: payload.medical,
            consents: payload.consents,
          } as any);

          // 2) wenn schon DONE -> nur speichern
          if (isAlreadyDone) {
            return save$.pipe(switchMap((updated: any) => of({ updated, finalStatus: 'DONE' })));
          }

          // 3) sonst: speichern + DONE setzen
          return save$.pipe(
            switchMap((updated: any) =>
              this.api.updateStatus(s.id, 'DONE' as any).pipe(
                switchMap(() => of({ updated, finalStatus: 'DONE' }))
              )
            )
          );
        })
      )
      .subscribe({
        next: (res: any) => {
          if (!res) return;

          this.saving.set(false);

          const current = this.submission()!;
          this.submission.set({
            ...current,
            ...res.updated,
            status: res.finalStatus,
          } as any);

          this.form.markAsPristine();
          this.editing.set(false);

          this.snack.open(
            isAlreadyDone ? 'Änderungen gespeichert' : 'Gespeichert & als DONE markiert',
            'OK',
            { duration: 2200 }
          );
          if (!isAlreadyDone){
            this.router.navigate(['/admin']);
          }
        },
        error: () => {
          this.saving.set(false);
          this.snack.open('Speichern fehlgeschlagen', 'OK', { duration: 3500 });
        },
      });
  }


  private patchFormFromSubmission(s: SubmissionDetails) {
    this.resetSymptomsArray(this.normalizeSymptoms(s.medical?.symptoms));
    this.form.patchValue(
      {
        patientData: {
          firstName: s.patientData?.firstName ?? '',
          lastName: s.patientData?.lastName ?? '',
          birthDate: (s.patientData?.birthDate as any) ?? '',
          phone: s.patientData?.phone ?? '',
          email: s.patientData?.email ?? '',
          address: {
            street: s.patientData?.address?.street ?? '',
            houseNumber: s.patientData?.address?.houseNumber ?? '',
            zip: s.patientData?.address?.zip ?? '',
            city: s.patientData?.address?.city ?? '',
          },
        },
        medical: {
          allergies: (s.medical?.allergies ?? []) as any,
          medications: (s.medical?.medications ?? []) as any,
          preExistingConditions: (s.medical?.preExistingConditions ?? []) as any,
        },
        consents: {
          gdprAccepted: !!s.consents?.gdprAccepted,
          dataSharingAccepted: !!s.consents?.dataSharingAccepted,
        },
      },
      { emitEvent: false }
    );
  }

  private resetSymptomsArray(symptoms: SymptomDetail[]) {
    const arr = this.form.controls.medical.controls.symptoms as FormArray;
    arr.clear();
    symptoms.forEach(item => {
      arr.push(this.createSymptomGroup({
        key: item.key,
        label: item.label,
        icon: this.symptomConfig(item.key).icon,
        options: this.symptomConfig(item.key).options,
      }, item));
    });
  }

  private createSymptomGroup(config: SymptomConfig, value?: SymptomDetail) {
    return this.fb.group({
      key: this.fb.nonNullable.control(value?.key ?? config.key),
      label: this.fb.nonNullable.control(value?.label ?? config.label),
      option: this.fb.control<string | null>(value?.option ?? null),
      severity: this.fb.nonNullable.control(value?.severity ?? 5),
      onset: this.fb.control<string | null>(value?.onset ?? null),
      notes: this.fb.control<string | null>(value?.notes ?? null),
    });
  }

  openAttachment(att: SubmissionAttachment) {
    const s = this.submission();
    if (!s) return;
    this.api.downloadAttachment(s.id, att.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => {
        this.snack.open('Datei konnte nicht geladen werden', 'OK', { duration: 3000 });
      },
    });
  }

  attachmentIcon(att: SubmissionAttachment) {
    if (att.contentType === 'application/pdf') return 'picture_as_pdf';
    if (att.contentType?.startsWith('image/')) return 'image';
    return 'attach_file';
  }

  formatFileSize(bytes?: number) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
}
