// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO Date String (YYYY-MM-DD)
  category?: MemberCategory;
  status?: MemberStatus;
}


// ==========================================
// Sport
// ==========================================
export interface SportResponse {
  id: string; // UUID
  name: string;
  description: string;
  max_capacity: number;
  additional_price: number;
  requires_medical_certificate: boolean;
}

export interface CreateSportRequest {
  name: string;
  description: string;
  max_capacity: number;
  additional_price: number;
  requires_medical_certificate: boolean;
}

export interface UpdateSportRequest {
  description?: string;
  max_capacity?: number;
  additional_price?: number;
  requires_medical_certificate?: boolean;
}




// ==========================================
// Locker
// ==========================================
export type LockerStatus = 'Available' | 'Occupied' | 'Maintenance';

export interface LockerDTO {
  id: string; // UUID
  number: number;
  location: string;
  status: LockerStatus;
  member_id: string | null;
  member_name?: string | null;
  created_at: string; // ISO Date String
}

export interface CreateLockerRequest {
  number: number;
  location: string;
  status?: LockerStatus;
  member_id?: string | null;
}

export interface UpdateLockerRequest {
  number?: number;
  location?: string;
  status?: LockerStatus;
  member_id?: string | null;
}


// ==========================================
// Enrollment
// ==========================================
export interface EnrollmentDTO {
  id: string; // UUID
  member_id: string;
  sport_id: string;
  enrollment_date: string; // ISO Date String
  is_active: boolean;
  member_name?: string;
  sport_name?: string;
}

export interface CreateEnrollmentRequest {
  member_id: string;
  sport_id: string;
  enrollment_date?: string; // ISO Date String, opcional
}


// ==========================
// = Medical Certificates
// ==========================


//datos que el front envía al back para crear un certificado medico
export interface CreateMedicalCertificateRequest {
  memberId: string
  expiryDate: string
  doctorLicense: string
}

export interface UpdateMedicalCertificateRequest {
  expiryDate?: string
  isValidated?: boolean
}

//(Objeto de Transferencia de Datos) enviada de vuelta al front como respuesta
export interface MedicalCertificateDTO {
  id: string
  issueDate: string
  expiryDate: string
  doctorLicense: string
  isValidated: boolean
  deletedAt: string | null

  memberId: string
}

export type PaymentStatus = 'Pending' | 'Paid' | 'Canceled';

export interface PaymentDTO {
    id: string;
    amount: number;
    month: number;
    year: number;
    status: PaymentStatus;
    due_date: string;
    payment_date: string | null;
    member_id: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePaymentRequest {
    member_id: string;
    amount: number;
    month: number;
    year: number;
    due_date: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  due_date?: string;
  month?: number;
  year?: number;
  payment_date?: string;
  status?: PaymentStatus;
  member_id?: string
}
