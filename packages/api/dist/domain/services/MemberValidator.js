export class MemberValidator {
    memberRepo;
    constructor(memberRepo) {
        this.memberRepo = memberRepo;
    }
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Formato de correo electrónico inválido');
        }
    }
    async validateDniIsUnique(dni, excludeMemberId) {
        const memberWithSameDni = await this.memberRepo.findByDni(dni);
        if (memberWithSameDni && memberWithSameDni.id !== excludeMemberId) {
            throw new Error('Ya existe un miembro con ese DNI');
        }
    }
    isMinor(birthdate) {
        const date = new Date(birthdate);
        const ageDifMs = Date.now() - date.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        return age < 18;
    }
}
