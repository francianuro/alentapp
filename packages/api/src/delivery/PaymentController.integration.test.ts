import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.ts';
import { CreatePaymentRequest } from '@alentapp/shared';

// Se mockea el repositori de pagos para no depender de la DB real
vi.mock('../infraestructure/PostgresPaymentRepository.ts', () => {
    return {
        PostgresPaymentRepository: class {
            async findAll() {
                return [
                    {
                        id: 'uuid-1',
                        amount: 1000,
                        month: 5,
                        year: 2026,
                        status: 'Pending',
                        member_id: 'uuid-member-1',
                        due_date: '2026-05-29',
                        payment_date: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ];
            }

            async findById(id: string) {
                if (id === 'uuid-1') return { id: 'uuid-1', amount: 1000, status: 'Pending', month: 5, year: 2026, member_id: 'uuid-member-1', due_date: '2026-05-29', payment_date: null, created_at: '', updated_at: '' };
                return null;
            }
            async create(data: any) {
                return { id: 'uuid-nuevo', ...data, status: 'Pending', payment_date: null, created_at: '', updated_at: '' };
            }
            async update(id: string, data: any) {
                return { id, amount: 1000, month: 5, year: 2026, status: 'Pending', member_id: 'uuid-member-1', due_date: '', payment_date: null, created_at: '', updated_at: '', ...data };
            }
        }
    };
});

// Se mockea el repositorio de Miembros (necesario para PaymentValidator.validateMemberExists)
vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return id === 'uuid-member-1' ? { id: 'uuid-member-1', name: 'Test Member' } : null;
            }
            async findAll() { return []; }
            async findByDni() { return null; }
            async create(data: any) { return { id: 'new', ...data }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete() { return; }
        }
    };
});


describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    // TEST DE INTEGRACION 1
    it('GET /api/v1/pagos - debe retornar 200 y la lista de pagos', async () => {
        const response = await app.inject({ method: 'GET', url: '/api/v1/pagos' });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);

        expect(body.data).toBeInstanceOf(Array);
        expect(body.data[0].id).toBe('uuid-1');
    });

    // TEST DE INTEGRACIÓN 2
    it('POST /api/v1/pagos — debe retornar 201 y crear un pago', async () => {
        const payload: CreatePaymentRequest = {
            member_id: 'uuid-member-1', // Este ID existe en el mock de MemberRepo
            amount: 2000,
            month: 6,
            year: 2026,
            due_date: '2026-06-30',
        };
        const response = await app.inject({ method: 'POST', url: '/api/v1/pagos', payload });
        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('Pending');
    });

    // TEST DE INTEGRACIÓN 3
    it('POST /api/v1/pagos — debe retornar 404 si el socio no existe', async () => {
        const payload: CreatePaymentRequest = {
            member_id: 'uuid-inexistente', // Este ID NO existe en el mock de MemberRepo
            amount: 2000,
            month: 6,
            year: 2026,
            due_date: '2026-06-30',
        };
        const response = await app.inject({ method: 'POST', url: '/api/v1/pagos', payload });
        expect(response.statusCode).toBe(404);
    });

    // TEST DE INTEGRACIÓN 4
    it('POST /api/v1/pagos — debe retornar 400 si el monto es inválido', async () => {
        const payload: CreatePaymentRequest = {
            member_id: 'uuid-member-1',
            amount: -100, // Monto inválido
            month: 6,
            year: 2026,
            due_date: '2026-06-30',
        };
        const response = await app.inject({ method: 'POST', url: '/api/v1/pagos', payload });
        expect(response.statusCode).toBe(400);
    });

    // TEST DE INTEGRACIÓN 5
    it('PUT /api/v1/pagos/:id — debe retornar 200 al actualizar un pago Pending', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/pagos/uuid-1', // El id uuid-1 existe en el mock del PaymentRepo con status Pending
            payload: { status: 'Paid' }
        });
        expect(response.statusCode).toBe(200);
    });

    // TEST DE INTEGRACIÓN 6
    it('PUT /api/v1/pagos/:id — debe retornar 404 si el pago no existe', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/pagos/uuid-inexistente',
            payload: { amount: 999 }
        });
        expect(response.statusCode).toBe(404);
    });
})