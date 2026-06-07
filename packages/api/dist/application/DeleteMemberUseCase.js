export class DeleteMemberUseCase {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
    }
    async execute(id) {
        // Validar existencia del miembro
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }
        // Ejecutar eliminación
        await this.memberRepo.delete(id);
    }
}
