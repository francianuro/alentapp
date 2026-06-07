export class UpdateMemberUseCase {
    memberRepo;
    memberValidator;
    constructor(memberRepo, memberValidator) {
        this.memberRepo = memberRepo;
        this.memberValidator = memberValidator;
    }
    async execute(id, data) {
        // Validar existencia del miembro
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }
        // Validar formato de email si se envió
        if (data.email) {
            this.memberValidator.validateEmail(data.email);
        }
        // Validar duplicidad de DNI si se envió y cambió
        if (data.dni && data.dni !== existingMember.dni) {
            await this.memberValidator.validateDniIsUnique(data.dni, id);
        }
        // Forzar categoría Cadete si es menor
        let finalData = { ...data };
        const birthdateStr = data.birthdate || existingMember.birthdate;
        if (birthdateStr) {
            if (this.memberValidator.isMinor(birthdateStr)) {
                finalData.category = 'Cadete';
            }
        }
        return this.memberRepo.update(id, finalData);
    }
}
