export class UpdatePaymentUseCase {
    paymentRepository;
    paymentValidator;
    constructor(paymentRepository, paymentValidator) {
        this.paymentRepository = paymentRepository;
        this.paymentValidator = paymentValidator;
    }
    async execute(id, data) {
        const existing = await this.paymentRepository.findById(id);
        if (!existing) {
            throw new Error('Error: Pago no encontrado');
        }
        if (existing.status === 'Canceled') {
            throw new Error('Error: No se permiten modificaciones en pagos cancelados');
        }
        if (existing.status === 'Paid') {
            throw new Error('Error: No se permiten modificaciones en pagos finalizados');
        }
        // Validaciones
        if (data.amount !== undefined) {
            this.paymentValidator.validateAmount(data.amount);
        }
        if (data.month !== undefined) {
            this.paymentValidator.validateMonth(data.month);
        }
        if (data.year !== undefined) {
            this.paymentValidator.validateYear(data.year);
        }
        const updateData = { ...data };
        if (data.status === 'Paid') {
            updateData.payment_date = new Date().toISOString().split('T')[0];
        }
        else if (data.status === 'Canceled') {
            updateData.deleted_at = new Date();
        }
        return await this.paymentRepository.update(id, updateData);
    }
}
