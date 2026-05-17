import { MedicalCertificateRepository } from "../domain/MedicalCertificateRepository.js"
export class DeleteMedicalCertificateUseCase {
  constructor(
    private readonly medicalCertificateRepository: MedicalCertificateRepository,
  ) {}
  async execute(id: string): Promise<void> {
    const certificate = await this.medicalCertificateRepository.findById(id)
    if (!certificate || certificate.deletedAt !== null) {
      throw new Error("Certificado no encontrado")
    }
    if (certificate.isValidated) {
      throw new Error("No se puede eliminar un certificado validado")
    }
    await this.medicalCertificateRepository.delete(id)
  }
}