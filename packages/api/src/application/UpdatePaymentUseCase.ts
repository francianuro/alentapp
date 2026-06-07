/**
 * Se implementa la siguiente lógica de negocio:
 * - Si el pago no existe en la base de datos -> lanza un error: "Error: Pago no encontrado" (para mapear a 404).
 * - Si el estado actual es 'Canceled' -> lanza un error: "Error: No se permiten modificaciones en pagos cancelados" (para mapear a 409).
 * - Si el estado actual es 'Paid' -> lanza un error: "Error: No se permiten modificaciones en pagos finalizados" (para mapear a 409).
 * - Si el estado cambia a 'Paid' -> autogenera payment_date con la fecha actual en formato YYYY-MM-DD.
 * - Si el estado cambia a 'Canceled' -> asigna la fecha y hora actual al campo `deleted_at`.
 * - Ejecuta las validaciones del `PaymentValidator`para cualquier campo modificado (como `amount`, `month`, `year`).
 */
import { PaymentDTO, UpdatePaymentRequest } from "@alentapp/shared";
import { PaymentRepository } from "../domain/PaymentRepository.js";
import { PaymentValidator } from "../domain/services/PaymentValidator.js";

export class UpdatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator
    ) {}

    async execute(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
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

        const updateData: any = { ...data };

        if (data.status === 'Paid') {
            updateData.payment_date = new Date().toISOString().split('T')[0];
        } else if (data.status === 'Canceled') {
            updateData.deleted_at = new Date();
        }

        return await this.paymentRepository.update(id, updateData);
    }
}