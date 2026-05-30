import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { CreateLockerRequest } from '@alentapp/shared';

vi.hoisted(() => {
    process.env.DATABASE_URL =
        process.env.DATABASE_URL ?? 'postgresql://admin:password123@localhost:5432/alentapp_db';
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
    PostgresMemberRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async findByDni() {
            return null;
        }
        async create(data: any) {
            return { id: 'member-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
        async delete() {
            return;
        }
    },
}));

vi.mock('../infrastructure/PostgresSportRepository.js', () => ({
    PostgresSportRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async findByName() {
            return null;
        }
        async create(data: any) {
            return { id: 'sport-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
        async delete() {
            return;
        }
    },
}));

vi.mock('../infrastructure/PostgresEnrollmentRepository.js', () => ({
    PostgresEnrollmentRepository: class {
        async create(data: any) {
            return { id: 'enrollment-1', ...data };
        }
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async existsBySportId() {
            return false;
        }
        async existsByMemberAndSport() {
            return false;
        }
        async delete() {
            return;
        }
    },
}));

vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => ({
    PostgresMedicalCertificateRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async create(data: any) {
            return { id: 'cert-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
        async delete() {
            return;
        }
    },
}));

vi.mock('../infrastructure/PostgresPaymentRepository.ts', () => ({
    PostgresPaymentRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async create(data: any) {
            return { id: 'payment-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
    },
}));

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    const existingLocker = {
        id: '1',
        number: 101,
        location: 'Vestuario principal',
        status: 'Available' as const,
        member_id: null,
        member_name: null,
        created_at: '2026-01-01T00:00:00.000Z',
    };

    return {
        PostgresLockerRepository: class {
            async findAll() {
                return [existingLocker];
            }

            async findById(id: string) {
                return id === '1' ? existingLocker : null;
            }

            async findByNumber(number: number) {
                return number === 101 ? existingLocker : null;
            }

            async create(data: any) {
                return {
                    id: '2',
                    number: data.number,
                    location: data.location,
                    status: data.status ?? 'Available',
                    member_id: data.member_id ?? null,
                    member_name: null,
                    created_at: new Date().toISOString(),
                };
            }

            async update(id: string, data: any) {
                return { ...existingLocker, id, ...data };
            }

            async delete(_id: string) {
                return;
            }
        },
    };
});

const { buildApp } = await import('../app.js');

describe('Locker API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/lockers', () => {
        it('debe retornar código 200 y el listado de lockers', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].number).toBe(101);
            expect(body.data[0].location).toBe('Vestuario principal');
        });
    });

    describe('POST /api/v1/lockers', () => {
        it('debe retornar 201 y crear el locker', async () => {
            const payload: CreateLockerRequest = {
                number: 102,
                location: 'Vestuario secundario',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.number).toBe(102);
            expect(body.data.location).toBe('Vestuario secundario');
            expect(body.data.status).toBe('Available');
            expect(body.data.id).toBeDefined();
        });

        it('debe atravesar la capa de validación y retornar 409 si el número ya existe', async () => {
            const payload: CreateLockerRequest = {
                number: 101,
                location: 'Otra ubicación',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un locker con ese numero');
        });

        it('debe retornar 400 si el número es inválido', async () => {
            const payload: CreateLockerRequest = {
                number: 0,
                location: 'Vestuario',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El número de locker debe ser mayor a cero');
        });
    });

    describe('DELETE /api/v1/lockers/:id', () => {
        it('debe retornar 204 si se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/1',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el locker a eliminar no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/999',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El locker no existe');
        });
    });
});
