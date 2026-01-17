export type SubmissionStatus = 'NEW' | 'VIEWED' | 'DONE';

export interface SubmissionCreateRequest {
  formVersion: string;
  patientData: PatientData;
  medical: MedicalData;
  consents: Consents;
  signature: Signature;
  // meta?: SubmissionMeta; // optional, später
}

export interface PatientData {
  firstName: string;
  lastName: string;
  birthDate: string; // ISO: YYYY-MM-DD
  phone?: string;
  email?: string;
  address?: Address;
}

export interface Address {
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
}

export interface MedicalData {
  allergies?: string[];
  medications?: string[];
  preExistingConditions?: string[];
  symptoms?: SymptomDetail[];
}

export interface SymptomDetail {
  key: string;
  label: string;
  option?: string | null;
  severity?: number | null;
  onset?: string | null;
  notes?: string | null;
}

export interface Consents {
  gdprAccepted: boolean;
  dataSharingAccepted: boolean;
  acceptedAt?: string | null; // ISO
}
export interface ZipSuggestion {
  zip: string;
  city: string;
}

export interface Signature {
  contentType: string;
  base64: string;
  strokes?: SignatureStroke[];
}

export interface SignatureStroke {
  points: SignaturePoint[];
}

export interface SignaturePoint {
  x: number;
  y: number;
  t?: number;
}
