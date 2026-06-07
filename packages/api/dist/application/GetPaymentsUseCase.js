export class GetPaymentsUseCase {
    paymentRepository;
    constructor(paymentRepository) {
        this.paymentRepository = paymentRepository;
    }
    async execute() {
        return await this.paymentRepository.findAll();
    }
}
