import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Locker API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLockerId: string;

    const testLockerNumber = 900000 + Math.floor(Math.random() * 100000);

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();
    });

    afterAll(async () => {
        if (createdLockerId) {
            await prisma.locker.deleteMany({
                where: { id: createdLockerId },
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    // TDD-0007: listado inicial para la tabla principal
    it('1. GET: Debe retornar la lista de lockers existente', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/lockers',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    // TDD-0007: alta de locker con estado Available y persistencia en PostgreSQL
    it('2. POST: Debe crear un locker en la base de datos real', async () => {
        const payload = {
            number: testLockerNumber,
            location: 'Vestuario E2E',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.number).toBe(testLockerNumber);
        expect(body.data.location).toBe('Vestuario E2E');
        expect(body.data.status).toBe('Available');

        createdLockerId = body.data.id;

        const dbLocker = await prisma.locker.findUnique({ where: { id: createdLockerId } });
        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.number).toBe(testLockerNumber);
        expect(dbLocker?.location).toBe('Vestuario E2E');
        expect(dbLocker?.status).toBe('Available');
    });

    // TDD-0009: borrado físico (hard delete) y verificación en PostgreSQL
    it('3. DELETE: Debe eliminar físicamente el locker de la base de datos', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/lockers/${createdLockerId}`,
        });

        expect(response.statusCode).toBe(204);

        const dbLocker = await prisma.locker.findUnique({ where: { id: createdLockerId } });
        expect(dbLocker).toBeNull();

        createdLockerId = '';
    });
});
