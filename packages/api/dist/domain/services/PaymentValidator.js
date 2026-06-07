export class PaymentValidator {
    memberRepository;
    constructor(memberRepository) {
        this.memberRepository = memberRepository;
    }
    async validateMemberExists(memberId) {
        const member = await this.memberRepository.findById(memberId);
        if (!member) {
            throw new Error('Error: El socio especificado no existe');
        }
    }
    validateAmount(amount) {
        if (amount <= 0) {
            throw new Error('Error: El monto debe ser mayor a cero');
        }
    }
    validateMonth(month) {
        if (month < 1 || month > 12) {
            throw new Error('Error: Mes inválido. Debe estar entre 1 y 12');
        }
    }
    validateYear(year) {
        if (year < 1900 || year > 2100) {
            throw new Error('Error: Año inválido. Debe estar entre 1900 y 2100');
        }
    }
    async validateAll(data) {
        await this.validateMemberExists(data.member_id);
        this.validateAmount(data.amount);
        this.validateMonth(data.month);
        this.validateYear(data.year);
    }
}
