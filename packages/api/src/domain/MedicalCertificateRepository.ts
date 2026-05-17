import {
  CreateMedicalCertificateRequest,
  UpdateMedicalCertificateRequest,
  MedicalCertificateDTO
} from "@alentapp/shared"
export interface MedicalCertificateRepository {
  create(
    data: CreateMedicalCertificateRequest
  ): Promise<MedicalCertificateDTO>
  invalidatePreviousCertificates(
    memberId: string
  ): Promise<void>
  findAll(): Promise<MedicalCertificateDTO[]>
  findById(id: string): Promise<MedicalCertificateDTO | null>
  update(
    id: string,
    data: UpdateMedicalCertificateRequest
  ): Promise<MedicalCertificateDTO>
  delete(id: string): Promise<void>
}