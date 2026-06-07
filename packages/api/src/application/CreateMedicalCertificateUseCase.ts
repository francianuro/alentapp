import {
  CreateMedicalCertificateRequest,
  MedicalCertificateDTO
} from "@alentapp/shared"
import { MedicalCertificateRepository } from "../domain/MedicalCertificateRepository.js"
import { MemberRepository } from "../domain/MemberRepository.js"
import { MedicalCertificateValidator } from "../domain/services/MedicalCertificateValidator.js" 
export class CreateMedicalCertificateUseCase {
  constructor(
    private readonly medicalCertificateRepository: MedicalCertificateRepository,
    private readonly memberRepository: MemberRepository,
    private readonly medicalCertificateValidator: MedicalCertificateValidator
  ) {}
  async execute(
    data: CreateMedicalCertificateRequest
  ): Promise<MedicalCertificateDTO> {
    // 1. Valido request
    this.medicalCertificateValidator.validate(data)
    // 2. Verifico que el socio existe
    const member = await this.memberRepository.findById(
      data.memberId
    )
    if (!member) {
      throw new Error("El socio no existe")
    }
    // 3. Invalidar certificados anteriores
    await this.medicalCertificateRepository
      .invalidatePreviousCertificates(data.memberId)
    // 4. Crear nuevo certificado
    return await this.medicalCertificateRepository
      .create(data)
  }
}