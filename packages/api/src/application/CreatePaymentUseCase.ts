import { CreatePaymentRequest, PaymentDTO } from "@alentapp/shared";
import { PaymentRepository } from "../domain/PaymentRepository.js";
import { PaymentValidator } from "../domain/services/PaymentValidator.js";

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator
    ) { }

    async execute(request: CreatePaymentRequest): Promise<PaymentDTO> {
        // 1. Validar reglas de negocio
        await this.paymentValidator.validateAll(request);

        // 2. Persistir el pago
        return await this.paymentRepository.create(request);
    }
}