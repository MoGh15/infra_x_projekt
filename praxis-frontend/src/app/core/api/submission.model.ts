export type SubmissionStatus = 'NEW' | 'VIEWED' | 'DONE';

export interface SubmissionListItem {
  id: string;               // gemappt von _id
  createdAt: string;        // ISO
  status: SubmissionStatus;
  formVersion: string;
  patientData?: {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    phone?: string;
    email?: string;
    address?: Address;
  };
}
export interface Address {
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
}
export interface SubmissionDetails extends SubmissionListItem {
  medical?: {
    allergies?: string[];
    medications?: string[];
    preExistingConditions?: string[];
    symptoms?: SymptomDetail[];
  };
  consents?: {
    gdprAccepted: boolean;
    dataSharingAccepted: boolean;
    acceptedAt?: string | null; // ISO
  };
  signature?: Signature | null;
  meta?: {
    tabletId?: string;
    language?: string;
    userAgent?: string;
    ip?: string;
  };
  attachments?: SubmissionAttachment[];
}

export interface SymptomDetail {
  key: string;
  label: string;
  option?: string | null;
  severity?: number | null;
  onset?: string | null;
  notes?: string | null;
}

export interface SubmissionAttachment {
  id: string;
  fileName: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Signature {
  contentType?: string;
  base64?: string;
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
