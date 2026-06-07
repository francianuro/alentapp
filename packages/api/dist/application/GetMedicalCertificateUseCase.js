export class GetMedicalCertificatesUseCase {
    medicalCertificateRepo;
    constructor(medicalCertificateRepo) {
        this.medicalCertificateRepo = medicalCertificateRepo;
    }
    async execute() {
        return this.medicalCertificateRepo.findAll();
    }
}
