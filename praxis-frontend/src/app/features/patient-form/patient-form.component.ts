import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  AbstractControl,
  Validators,
  ValidationErrors,
  FormsModule, FormArray, FormControl
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { PublicSubmissionsService } from '../../core/api/public-submissions.service';
import { SubmissionCreateRequest } from '../../core/api/submission-create.model';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import { MatChipOption, MatChipSelectionChange, MatChipsModule } from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDivider} from '@angular/material/list';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import {SYMPTOM_CATALOG, SYMPTOM_DURATION_OPTIONS, SymptomConfig} from '../../shared/symptoms/symptom-catalog';
import { SymptomDetailDialogComponent } from './symptom-detail-dialog.component';
import { SymptomDetail } from '../../core/api/submission-create.model';
@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepicker,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSliderModule,
    FormsModule,
    MatDivider,
  ],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss'],
})

export class PatientFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(PublicSubmissionsService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // Patterns (tablet-freundlich)
  private readonly zipDE = /^\d{5}$/;
  private readonly phoneAllowedChars = /^[0-9+\-()\/\s]{7,}$/; // grob
  private readonly houseNumberPattern = /^[0-9]{1,5}\s*[a-zA-Z]?([\-\/]\s*[0-9]{1,5}\s*[a-zA-Z]?)?$/;

  today = new Date();
  submitting = signal(false);
  cityLocked = signal(false);

// Vorschläge (kannst du später aus Config/Backend laden)
  allergyOptions = ['Pollen', 'Hausstaub', 'Tierhaare', 'Penicillin', 'Nüsse', 'Latex'];
  medicationOptions = ['Ibuprofen', 'Paracetamol', 'ASS', 'Metformin', 'Insulin'];
  conditionOptions = ['Diabetes', 'Asthma', 'Bluthochdruck', 'Herzkrankheit', 'Schilddrüse'];
  symptomCatalog = SYMPTOM_CATALOG;
  symptomDurationOptions = SYMPTOM_DURATION_OPTIONS;

// Extra-Input pro Liste
  extraAllergy = this.fb.nonNullable.control('');
  extraMedication = this.fb.nonNullable.control('');
  extraCondition = this.fb.nonNullable.control('');
  extraSymptom = this.fb.nonNullable.control('');
  constructor(
    private http: HttpClient
  ) {
    this.initZipListener();
  }

  form = this.fb.nonNullable.group({
    patientData: this.fb.nonNullable.group({
      firstName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
      lastName: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
      birthDate: this.fb.nonNullable.control<Date | null>(null, [Validators.required]),

      phone: this.fb.control<string | null>(null, [this.optionalPhoneValidator()]),
      email: this.fb.control<string | null>(null, [Validators.email]),

      address: this.fb.nonNullable.group({
        street: this.fb.control<string | null>(null),
        houseNumber: this.fb.control<string | null>(null, [this.optionalPatternValidator(this.houseNumberPattern)]),
        zip: this.fb.control<string | null>(null, [this.optionalPatternValidator(this.zipDE)]),
        city: this.fb.control<string | null>(null),
      },
        { validators: [this.addressAllOrNoneValidator()] }),
    }),

    medical: this.fb.nonNullable.group({
      allergies: this.fb.nonNullable.control<string[]>([]),
      medications: this.fb.nonNullable.control<string[]>([]),
      preExistingConditions: this.fb.nonNullable.control<string[]>([]),
      symptoms: this.fb.array([]),
    }),

    consents: this.fb.nonNullable.group({
      gdprAccepted: this.fb.nonNullable.control(false, [Validators.requiredTrue]),
      dataSharingAccepted: this.fb.nonNullable.control(false),
    }),
  });

  // helpers fürs Template (verhindert TS4111 / index-signature)
  pd = computed(() => this.form.controls.patientData.controls);
  addr = computed(() => this.form.controls.patientData.controls.address.controls);
  cons = computed(() => this.form.controls.consents.controls);
  med = computed(() => this.form.controls.medical.controls);
  symptomValues$ = (this.form.controls.medical.controls.symptoms as FormArray).valueChanges.pipe(
    startWith((this.form.controls.medical.controls.symptoms as FormArray).getRawValue() as SymptomDetail[])
  );

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Bitte Pflichtfelder prüfen.', 'OK', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();
    const birthDate: Date | null = this.form.value.patientData?.birthDate ?? null;
    console.log(this.toIsoDateOnly(birthDate!))
    const payload: SubmissionCreateRequest = {
      formVersion: 'v1',
      patientData: {
        firstName: v.patientData.firstName,
        lastName: v.patientData.lastName,
        birthDate: this.toIsoDateOnly(birthDate!),
        phone: this.cleanOptional(v.patientData.phone),
        email: this.cleanOptional(v.patientData.email),
        address: this.cleanAddress(v.patientData.address),
      },
      medical: {
        allergies: this.form.controls.medical.controls.allergies.value,
        medications: this.form.controls.medical.controls.medications.value,
        preExistingConditions: this.form.controls.medical.controls.preExistingConditions.value,
        symptoms: (this.form.controls.medical.controls.symptoms as FormArray).getRawValue(),
      },
      consents: {
        gdprAccepted: v.consents.gdprAccepted,
        dataSharingAccepted: v.consents.dataSharingAccepted,
        acceptedAt: v.consents.gdprAccepted ? new Date().toISOString() : null,
      },
    };

    console.log('CONSENTS', v.consents);

    this.submitting.set(true);
    this.api.createSubmission(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.resetForm();
        this.router.navigate(['/form/success']);
      },
      error: () => {
        this.submitting.set(false);
        this.snack.open('Senden fehlgeschlagen. Bitte erneut versuchen.', 'OK', { duration: 3500 });
      },
    });
  }

  resetForm() {
    this.form.reset({
      patientData: {
        firstName: '',
        lastName: '',
        birthDate: null,
        phone: null,
        email: null,
        address: {
          street: null,
          houseNumber: null,
          zip: null,
          city: null,
        },
      },
      medical: {
        allergies: [],
        medications: [],
        preExistingConditions: [],
      },
      consents: { gdprAccepted: false, dataSharingAccepted: false },
    });
    (this.form.controls.medical.controls.symptoms as FormArray).clear();
    this.extraAllergy.setValue('');
    this.extraMedication.setValue('');
    this.extraCondition.setValue('');
    this.extraSymptom.setValue('');
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private parseList(text: string | null): string[] | undefined {
    const raw = (text ?? '').trim();
    if (!raw) return undefined;

    const items = raw
      .split(/[\n,;]/g)
      .map(s => s.trim())
      .filter(Boolean);

    return items.length ? items : undefined;
  }

  private toIsoDateOnly(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }


  private cleanOptional(v: string | null): string | undefined {
    const t = (v ?? '').trim();
    return t ? t : undefined;
  }

  private cleanAddress(addr: {
    street: string | null;
    houseNumber: string | null;
    zip: string | null;
    city: string | null;
  }): { street: string; houseNumber: string; zip: string; city: string } | undefined {
    const street = (addr.street ?? '').trim();
    const houseNumber = (addr.houseNumber ?? '').trim();
    const zip = (addr.zip ?? '').trim();
    const city = (addr.city ?? '').trim();

    const hasAny = street || houseNumber || zip || city;
    if (!hasAny) return undefined;

    return {
      street,
      houseNumber,
      zip,
      city,
    };
  }

  /** Pattern-Validator, aber nur wenn Feld nicht leer ist */
  private optionalPatternValidator(pattern: RegExp) {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value ?? '').toString().trim();
      if (!v) return null;
      return pattern.test(v) ? null : { pattern: true };
    };
  }

  private addressAllOrNoneValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      const g = group as any;
      const street = (g.get('street')?.value ?? '').trim();
      const houseNumber = (g.get('houseNumber')?.value ?? '').trim();
      const zip = (g.get('zip')?.value ?? '').trim();
      const city = (g.get('city')?.value ?? '').trim();

      const any = street || houseNumber || zip || city;
      const all = street && houseNumber && zip && city;

      if (!any || all) return null;
      return { addressIncomplete: true };
    };
  }


  /** Telefon: nur wenn gesetzt prüfen + mind. 7 Ziffern */
  private optionalPhoneValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = (control.value ?? '').toString().trim();
      if (!raw) return null;

      // Zeichen grob prüfen
      if (!this.phoneAllowedChars.test(raw)) return { phone: true };

      // echte Ziffern zählen
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 7) return { phone: true };

      return null;
    };
  }

  private initZipListener() {
    const zipCtrl = this.form.controls.patientData.controls.address.controls.zip;
    const cityCtrl = this.form.controls.patientData.controls.address.controls.city;

    zipCtrl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(zip => {
        const value = (zip ?? '').toString().trim();

        // 🧹 PLZ leer oder unvollständig → Ort leeren & freigeben
        if (!/^\d{5}$/.test(value)) {
          if (cityCtrl.value) {
            cityCtrl.setValue('', { emitEvent: false });
          }
          this.cityLocked.set(false);
          return;
        }

        // ✅ PLZ valide → Ort nachschlagen
        this.lookupCityByZip(value, cityCtrl);
      });
  }


  private lookupCityByZip(zip: string, cityCtrl: any) {
    this.cityLocked.set(true);

    this.http
      .get<any>(`https://api.zippopotam.us/de/${zip}`)
      .subscribe({
        next: (res) => {
          const place = res?.places?.[0];
          if (place?.['place name']) {
            cityCtrl.setValue(place['place name'], { emitEvent: false });
          } else {
            this.cityLocked.set(false);
          }
        },
        error: () => {
          // PLZ nicht gefunden → manuell erlauben
          this.cityLocked.set(false);
        },
      });
  }
  toggleFromOptions(ctrl: FormControl<string[]>, value: string, checked: boolean) {
    const set = new Set(ctrl.value); // ctrl.value ist string[]
    checked ? set.add(value) : set.delete(value);
    ctrl.setValue([...set]);
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  addExtra(ctrl: FormControl<string[]>, inputCtrl: FormControl<string>) {
    const raw = (inputCtrl.value ?? '').trim();
    if (!raw) return;

    // Optional: Split erlauben (Komma/Zeilen)
    const items = raw
      .split(/[\n,]+/g)
      .map(s => s.trim())
      .filter(Boolean);

    const set = new Set(ctrl.value);
    for (const it of items) set.add(it);

    ctrl.setValue([...set]);
    inputCtrl.setValue('');
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  removeChip(ctrl: FormControl<string[]>, value: string) {
    ctrl.setValue(ctrl.value.filter(v => v !== value));
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  isSelected(ctrl: FormControl<string[]>, value: string) {
    return ctrl.value.includes(value);
  }

  isSymptomSelected(key: string) {
    return this.findSymptomIndex(key) >= 0;
  }

  onSymptomSelection(config: SymptomConfig, change: MatChipSelectionChange) {
    const selected = change.selected;
    const idx = this.findSymptomIndex(config.key);
    if (selected && idx === -1) {
      this.openSymptomDialog(config, undefined, change.source);
      return;
    }
    if (!selected && idx >= 0) {
      (this.form.controls.medical.controls.symptoms as FormArray).removeAt(idx);
    }
  }

  editSymptom(symptom: SymptomDetail) {
    const config = this.symptomConfig(symptom.key);
    this.openSymptomDialog(config, symptom);
  }

  removeSymptomByKey(key: string) {
    const idx = this.findSymptomIndex(key);
    if (idx >= 0) {
      (this.form.controls.medical.controls.symptoms as FormArray).removeAt(idx);
    }
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
    const config: SymptomConfig = { key, label: raw, icon: 'healing' };
    this.extraSymptom.setValue('');
    this.openSymptomDialog(config);
  }

  symptomConfig(key: string) {
    return this.symptomCatalog.find(item => item.key === key) ?? { key, label: key, icon: 'healing' };
  }

  private createSymptomGroup(config: SymptomConfig) {
    return this.fb.group({
      key: this.fb.nonNullable.control(config.key),
      label: this.fb.nonNullable.control(config.label),
      option: this.fb.control<string | null>(null),
      severity: this.fb.nonNullable.control(5),
      onset: this.fb.control<string | null>(null),
      notes: this.fb.control<string | null>(null),
    });
  }

  private openSymptomDialog(config: SymptomConfig, existing?: SymptomDetail, chip?: MatChipOption) {
    const ref = this.dialog.open(SymptomDetailDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true,
      data: { config, value: existing ?? null },
    });

    ref.afterClosed().subscribe((result: SymptomDetail | null) => {
      if (!result) {
        chip?.deselect();
        return;
      }
      const idx = this.findSymptomIndex(result.key);
      const arr = this.form.controls.medical.controls.symptoms as FormArray;
      if (idx >= 0) {
        arr.at(idx).patchValue(result);
      } else {
        arr.push(this.createSymptomGroup(config));
        arr.at(arr.length - 1).patchValue(result);
      }
    });
  }

  private findSymptomIndex(key: string) {
    const arr = this.form.controls.medical.controls.symptoms as FormArray;
    return arr.controls.findIndex(ctrl => (ctrl as any).value?.key === key);
  }

  // medicalConfigs = [
  //   {
  //     key: 'allergies' as const,
  //     title: 'Allergien',
  //     placeholder: 'Allergie hinzufügen…',
  //     presets: ['Pollen', 'Hausstaub', 'Tierhaare', 'Penicillin', 'Nüsse', 'Laktose', 'Gluten', 'Histamin'],
  //   },
  //   {
  //     key: 'medications' as const,
  //     title: 'Medikamente',
  //     placeholder: 'Medikament hinzufügen…',
  //     presets: ['Ibuprofen', 'Paracetamol', 'Aspirin', 'Metformin', 'Insulin', 'ASS', 'Omeprazol'],
  //   },
  //   {
  //     key: 'preExistingConditions' as const,
  //     title: 'Vorerkrankungen',
  //     placeholder: 'Vorerkrankung hinzufügen…',
  //     presets: ['Diabetes', 'Asthma', 'Bluthochdruck', 'Herzkrankheit', 'Epilepsie', 'Schilddrüse', 'Migräne'],
  //   },
  // ];
  //
  // customInput = {
  //   allergies: '',
  //   medications: '',
  //   preExistingConditions: '',
  // } as Record<'allergies' | 'medications' | 'preExistingConditions', string>;
  //
  // protected medicalCtrl(key: "allergies" | "medications" | "preExistingConditions") {
  //   return this.form.controls.medical.controls[key];
  // }
  //
  // hasItem(key: 'allergies' | 'medications' | 'preExistingConditions', value: string): boolean {
  //   const arr = this.medicalCtrl(key).value ?? [];
  //   return arr.includes(value);
  // }
  //
  // togglePreset(key: 'allergies' | 'medications' | 'preExistingConditions', value: string) {
  //   const ctrl = this.medicalCtrl(key);
  //   const arr = [...(ctrl.value ?? [])];
  //
  //   const idx = arr.indexOf(value);
  //   if (idx >= 0) arr.splice(idx, 1);
  //   else arr.push(value);
  //
  //   ctrl.setValue(arr);
  //   ctrl.markAsDirty();
  // }
  //
  // addCustom(key: 'allergies' | 'medications' | 'preExistingConditions') {
  //   const raw = (this.customInput[key] ?? '').trim();
  //   if (!raw) return;
  //
  //   const ctrl = this.medicalCtrl(key);
  //   const arr = [...(ctrl.value ?? [])];
  //
  //   // Mehrere Werte erlauben: Komma oder neue Zeile
  //   const parts = raw
  //     .split(/,|\n/)
  //     .map(s => s.trim())
  //     .filter(Boolean);
  //
  //   for (const p of parts) {
  //     if (!arr.includes(p)) arr.push(p);
  //   }
  //
  //   ctrl.setValue(arr);
  //   ctrl.markAsDirty();
  //   this.customInput[key] = '';
  // }
  //
  // removeItem(key: 'allergies' | 'medications' | 'preExistingConditions', value: string) {
  //   const ctrl = this.medicalCtrl(key);
  //   const arr = [...(ctrl.value ?? [])].filter(v => v !== value);
  //   ctrl.setValue(arr);
  //   ctrl.markAsDirty();
  // }

}
