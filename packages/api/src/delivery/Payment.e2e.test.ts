import 'dotenv/config';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.ts';

describe('Payment API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    let createdPaymentId: string;

    // Sufijo aleatorio para no colisionar con datos de desarrollo
    const randomSuffix = Math.floor(Math.random() * 100000).toString();

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),

        });

        await prisma.$connect();

        // Pre-condición: Creo un socio real para asociarlo al pago
        const memberResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/socios',
            payload: {
                name: `Socio E2E Payment`,
                dni: `PE2E${randomSuffix}`,
                email: `pe2e${randomSuffix}@test.com`,
                birthdate: '1990-01-01',
                category: 'Pleno'
            }
        });

        const memberBody = JSON.parse(memberResponse.payload);
        createdMemberId = memberBody.data.id;
    });

    afterAll(async () => {
        // Limpieza: Primero el pago (FK), luego el socio
        if (createdPaymentId) {
            await prisma.payment.deleteMany({ where: { id: createdPaymentId } });
        }
        if (createdMemberId) {
            await prisma.member.deleteMany({ where: { id: createdMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });


    // E2E TEST 1: Crear un pago real en la DB
    it('1. POST: Debe crear un pago en la base de datos real', async () => {
        const payload = {
            member_id: createdMemberId,
            amount: 5000,
            month: 5,
            year: 2026,
            due_date: '2026-05-31',
        };
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/pagos',
            payload
        });
        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.id).toBeDefined();
        expect(body.status).toBe('Pending'); // Estado inicial siempre Pending

        createdPaymentId = body.id;
        // Verificación directa en PostgreSQL
        const dbPayment = await prisma.payment.findUnique({ where: { id: createdPaymentId } });
        expect(dbPayment).not.toBeNull();
        expect(dbPayment?.amount).toBeCloseTo(5000);
    });


    // E2E TEST 2: Actualizar estado del pago a Paid
    it('2. PUT: Debe actualizar el estado del pago a Paid y generar payment_date', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/pagos/${createdPaymentId}`,
            payload: { status: 'Paid' }
        });
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('Paid');
        expect(body.payment_date).not.toBeNull(); // Debe auto-generar la fecha
        // Verificar en la BD real
        const dbPayment = await prisma.payment.findUnique({ where: { id: createdPaymentId } });
        expect(dbPayment?.status).toBe('Paid');
    });


    // E2E TEST 3: Intentar modificar un pago que ya fue Paid (debe fallar)
    it('3. PUT: No debe permitir modificar un pago ya pagado', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/pagos/${createdPaymentId}`,
            payload: { amount: 9999 } // Intentamos cambiar el monto de un pago ya cerrado
        });
        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.payload);
        expect(body.error).toContain('finalizados');
    });
})
