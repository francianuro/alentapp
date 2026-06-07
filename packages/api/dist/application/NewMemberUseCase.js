export class CreateMemberUseCase {
    memberRepository;
    memberValidator;
    constructor(memberRepository, memberValidator) {
        this.memberRepository = memberRepository;
        this.memberValidator = memberValidator;
    }
    async execute(data) {
        // 1. Validaciones de negocio (centralizadas)
        this.memberValidator.validateEmail(data.email);
        await this.memberValidator.validateDniIsUnique(data.dni);
        const isMinor = this.memberValidator.isMinor(data.birthdate);
        const finalCategory = isMinor ? 'Cadete' : data.category;
        // 2. Persistencia a través de la interfaz (sin saber qué DB es)
        const nuevoSocio = await this.memberRepository.create({
            ...data,
            category: finalCategory,
            status: 'Activo', // Regla de negocio: todos nacen activos
            created_at: new Date().toISOString(),
        });
        return nuevoSocio;
    }
}
