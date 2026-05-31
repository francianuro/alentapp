import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';

const repositoryState = vi.hoisted(() => ({
  payments: [] as any[]
}));

const resetRepositoryState = () => {
  repositoryState.payments = [
    {
      id: 'uuid-1',
      member_id: 'uuid-member-1',
      amount: 1000,
      month: 5,
      year: 2026,
      due_date: '2026-05-29',
      status: 'Pending',
      payment_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};

vi.mock('../infrastructure/PostgresPaymentRepository.ts', () => ({
  PostgresPaymentRepository: class {
    async findAll() {
      return repositoryState.payments;
    }

    async findById(id: string) {
      return repositoryState.payments.find(p => p.id === id) ?? null;
    }

    async create(data: any) {
      const payment = {
        id: `payment-${repositoryState.payments.length + 1}`,
        ...data,
        status: 'Pending',
        payment_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      repositoryState.payments.push(payment);

      return payment;
    }

    async update(id: string, data: any) {
      const payment = repositoryState.payments.find(p => p.id === id);

      if (!payment) {
        return null;
      }

      Object.assign(payment, data, {
        updated_at: new Date().toISOString()
      });

      return payment;
    }
  }
}));

vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
  PostgresMemberRepository: class {
    async findById(id: string) {
      if (id === 'uuid-member-1') {
        return {
          id: 'uuid-member-1',
          name: 'Socio Test'
        };
      }

      return null;
    }
  }
}));

const { buildApp } = await import('../app.js');

describe('Payment API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  beforeEach(() => {
    resetRepositoryState();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TEST 1: GET /api/v1/pagos retorna 200 con array de datos', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/pagos'
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(body.data).toBeInstanceOf(Array);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('uuid-1');
  });

  it('TEST 2: POST /api/v1/pagos crea un pago y retorna 201 con estado Pending', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pagos',
      payload: {
        member_id: 'uuid-member-1',
        amount: 2000,
        month: 6,
        year: 2026,
        due_date: '2026-06-30'
      }
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.payload);

    expect(body.amount).toBe(2000);
    expect(body.status).toBe('Pending');
    expect(body.member_id).toBe('uuid-member-1');
  });

  it('TEST 3: POST /api/v1/pagos con member_id inexistente retorna 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pagos',
      payload: {
        member_id: 'member-inexistente',
        amount: 2000,
        month: 6,
        year: 2026,
        due_date: '2026-06-30'
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it('TEST 4: POST /api/v1/pagos con monto negativo retorna 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pagos',
      payload: {
        member_id: 'uuid-member-1',
        amount: -100,
        month: 6,
        year: 2026,
        due_date: '2026-06-30'
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('TEST 5: PUT /api/v1/pagos/:id actualiza un pago Pending y retorna 200', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/pagos/uuid-1',
      payload: {
        status: 'Paid'
      }
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(body.status).toBe('Paid');
  });

  it('TEST 6: PUT /api/v1/pagos/:id inexistente retorna 404', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/pagos/payment-inexistente',
      payload: {
        status: 'Paid'
      }
    });

    expect(response.statusCode).toBe(404);
  });
});