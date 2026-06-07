export class CreatePaymentUseCase {
    paymentRepository;
    paymentValidator;
    constructor(paymentRepository, paymentValidator) {
        this.paymentRepository = paymentRepository;
        this.paymentValidator = paymentValidator;
    }
    async execute(request) {
        // 1. Validar reglas de negocio
        await this.paymentValidator.validateAll(request);
        // 2. Persistir el pago
        return await this.paymentRepository.create(request);
    }
}
