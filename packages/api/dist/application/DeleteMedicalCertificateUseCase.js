export class DeleteMedicalCertificateUseCase {
    medicalCertificateRepository;
    constructor(medicalCertificateRepository) {
        this.medicalCertificateRepository = medicalCertificateRepository;
    }
    async execute(id) {
        const certificate = await this.medicalCertificateRepository.findById(id);
        if (!certificate || certificate.deletedAt !== null) {
            throw new Error("Certificado no encontrado");
        }
        if (certificate.isValidated) {
            throw new Error("No se puede eliminar un certificado validado");
        }
        await this.medicalCertificateRepository.delete(id);
    }
}
