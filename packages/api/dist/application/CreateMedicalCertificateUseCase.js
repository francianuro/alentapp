export class CreateMedicalCertificateUseCase {
    medicalCertificateRepository;
    memberRepository;
    medicalCertificateValidator;
    constructor(medicalCertificateRepository, memberRepository, medicalCertificateValidator) {
        this.medicalCertificateRepository = medicalCertificateRepository;
        this.memberRepository = memberRepository;
        this.medicalCertificateValidator = medicalCertificateValidator;
    }
    async execute(data) {
        // 1. Valido request
        this.medicalCertificateValidator.validate(data);
        // 2. Verifico que el socio existe
        const member = await this.memberRepository.findById(data.memberId);
        if (!member) {
            throw new Error("El socio no existe");
        }
        // 3. Invalidar certificados anteriores
        await this.medicalCertificateRepository
            .invalidatePreviousCertificates(data.memberId);
        // 4. Crear nuevo certificado
        return await this.medicalCertificateRepository
            .create(data);
    }
}
