import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
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
import { HttpClient, HttpEventType } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import { MatChipOption, MatChipSelectionChange, MatChipsModule } from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatDivider} from '@angular/material/list';
import {MatSelectModule} from '@angular/material/select';
import {MatSliderModule} from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatProgressBarModule,
    FormsModule,
    MatDivider,
  ],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.scss'],
})

export class PatientFormComponent implements AfterViewInit {
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
  dragActive = signal(false);
  uploadState = signal<'idle' | 'uploading' | 'success' | 'error'>('idle');
  uploadProgress = signal(0);
  signatureHasInk = signal(false);
  signatureReady = signal(false);

  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;
  private signatureCtx: CanvasRenderingContext2D | null = null;
  private signatureDrawing = false;
  private signatureLastPoint: { x: number; y: number } | null = null;

  attachments: File[] = [];
  private readonly maxFiles = 5;
  private readonly maxFileSizeBytes = 10 * 1024 * 1024;
  private readonly allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

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
    signature: this.fb.nonNullable.group({
      contentType: this.fb.nonNullable.control('image/png'),
      base64: this.fb.nonNullable.control('', [Validators.required]),
    }),
  });

  // helpers fürs Template (verhindert TS4111 / index-signature)
  pd = computed(() => this.form.controls.patientData.controls);
  addr = computed(() => this.form.controls.patientData.controls.address.controls);
  cons = computed(() => this.form.controls.consents.controls);
  sig = computed(() => this.form.controls.signature.controls);
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
    // console.log(this.toIsoDateOnly(birthDate!))
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
      signature: {
        contentType: v.signature.contentType,
        base64: v.signature.base64,
      },
    };

    // console.log('PAYLOAD', payload);
    // console.log('PAYLOAD', this.attachments);
    this.submitting.set(true);
    this.uploadState.set('uploading');
    this.uploadProgress.set(0);
    this.api.createSubmission(payload, this.attachments).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          if (total > 0) {
            this.uploadProgress.set(Math.round((event.loaded / total) * 100));
          }
        }
        if (event.type === HttpEventType.Response) {
          this.submitting.set(false);
          this.uploadProgress.set(100);
          this.uploadState.set('success');
          setTimeout(() => this.uploadState.set('idle'), 2500);
          this.resetForm();
          this.router.navigate(['/form/success']);
        }
      },
      error: () => {
        this.submitting.set(false);
        this.uploadState.set('error');
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
      signature: { contentType: 'image/png', base64: '' },
    });
    (this.form.controls.medical.controls.symptoms as FormArray).clear();
    this.extraAllergy.setValue('');
    this.extraMedication.setValue('');
    this.extraCondition.setValue('');
    this.extraSymptom.setValue('');
    this.attachments = [];
    this.dragActive.set(false);
    this.uploadState.set('idle');
    this.uploadProgress.set(0);
    this.clearSignature(true);
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

  ngAfterViewInit() {
    this.setupSignatureCanvas();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeSignatureCanvas();
  }

  @HostListener('window:pointerup')
  onPointerUp() {
    this.endSignature();
  }

  private setupSignatureCanvas() {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    this.signatureCtx = canvas.getContext('2d');
    if (!this.signatureCtx) return;

    this.signatureCtx.lineWidth = 2.2;
    this.signatureCtx.lineCap = 'round';
    this.signatureCtx.lineJoin = 'round';
    this.signatureCtx.strokeStyle = '#1f2937';
    this.resizeSignatureCanvas();
  }

  private resizeSignatureCanvas() {
    const canvas = this.signatureCanvas?.nativeElement;
    const ctx = this.signatureCtx;
    if (!canvas || !ctx) return;

    const dataUrl = this.signatureReady() ? canvas.toDataURL('image/png') : null;
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = dataUrl;
    }
  }

  startSignature(event: PointerEvent) {
    if (!this.signatureCtx) return;
    event.preventDefault();
    const point = this.signaturePoint(event);
    if (!point) return;
    this.signatureDrawing = true;
    this.signatureLastPoint = point;
  }

  drawSignature(event: PointerEvent) {
    if (!this.signatureCtx || !this.signatureDrawing || !this.signatureLastPoint) return;
    event.preventDefault();
    const point = this.signaturePoint(event);
    if (!point) return;
    this.signatureCtx.beginPath();
    this.signatureCtx.moveTo(this.signatureLastPoint.x, this.signatureLastPoint.y);
    this.signatureCtx.lineTo(point.x, point.y);
    this.signatureCtx.stroke();
    this.signatureLastPoint = point;
    this.signatureHasInk.set(true);
  }

  endSignature() {
    if (!this.signatureDrawing) return;
    this.signatureDrawing = false;
    this.signatureLastPoint = null;
    this.captureSignature();
  }

  clearSignature(silent = false) {
    const canvas = this.signatureCanvas?.nativeElement;
    const ctx = this.signatureCtx;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.signatureHasInk.set(false);
    this.signatureReady.set(false);
    this.sig().base64.setValue('');
    if (!silent) {
      this.sig().base64.markAsTouched();
    }
  }

  private captureSignature() {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas || !this.signatureHasInk()) {
      this.signatureReady.set(false);
      this.sig().base64.setValue('');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1] ?? '';
    this.sig().base64.setValue(base64);
    this.signatureReady.set(!!base64);
  }

  private signaturePoint(event: PointerEvent) {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragActive.set(false);
    if (!event.dataTransfer?.files?.length) return;
    this.addFiles(Array.from(event.dataTransfer.files));
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragActive.set(false);
  }

  removeAttachment(index: number) {
    this.attachments = this.attachments.filter((_, i) => i !== index);
  }

  fileIcon(file: File) {
    if (file.type === 'application/pdf') return 'picture_as_pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'attach_file';
  }

  formatFileSize(bytes: number) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  private addFiles(files: File[]) {
    const errors: string[] = [];

    for (const file of files) {
      if (this.attachments.length >= this.maxFiles) {
        errors.push(`Maximal ${this.maxFiles} Dateien erlaubt.`);
        break;
      }

      if (!this.allowedTypes.has(file.type)) {
        errors.push(`${file.name}: Ungültiger Dateityp.`);
        continue;
      }

      if (file.size > this.maxFileSizeBytes) {
        errors.push(`${file.name}: Datei zu groß (max. 10 MB).`);
        continue;
      }

      const exists = this.attachments.some(existing =>
        existing.name === file.name && existing.size === file.size && existing.type === file.type
      );
      if (exists) {
        continue;
      }

      this.attachments = [...this.attachments, file];
    }

    if (errors.length) {
      this.snack.open(errors[0], 'OK', { duration: 3000 });
    }
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
