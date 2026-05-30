import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Sport API End-to-End Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let createdSportId: string;

  const randomSuffix = Math.floor(Math.random() * 100000).toString();
  const testSportName = `Sport E2E ${randomSuffix}`;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    prisma = new PrismaClient({
      adapter: new PrismaPg(process.env.DATABASE_URL as any),
    });

    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.sport.deleteMany({
      where: {
        OR: [
          { id: createdSportId || '' },
          { name: testSportName },
        ],
      },
    });

    await prisma.$disconnect();
    await app.close();
  });

  it('1. GET: Debe retornar la lista de deportes existente', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/deportes',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(Array.isArray(body.data)).toBe(true);
  });

  it('2. POST: Debe crear un deporte en la base de datos real', async () => {
    const payload = {
      name: ` ${testSportName} `,
      description: ' Deporte creado desde test E2E ',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/deportes',
      payload,
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.payload);

    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe(testSportName);
    expect(body.data.description).toBe('Deporte creado desde test E2E');
    expect(body.data.max_capacity).toBe(20);
    expect(body.data.additional_price).toBe(1500);
    expect(body.data.requires_medical_certificate).toBe(true);

    createdSportId = body.data.id;

    const dbSport = await prisma.sport.findUnique({
      where: { id: createdSportId },
    });

    expect(dbSport).not.toBeNull();
    expect(dbSport?.name).toBe(testSportName);
    expect(dbSport?.description).toBe('Deporte creado desde test E2E');
    expect(dbSport?.max_capacity).toBe(20);
    expect(Number(dbSport?.additional_price)).toBe(1500);
    expect(dbSport?.requires_medical_certificate).toBe(true);
  });

  it('3. PUT: Debe actualizar el deporte modificando la base de datos real', async () => {
    const updatePayload = {
      description: 'Deporte E2E actualizado',
      max_capacity: 30,
      additional_price: 2500,
      requires_medical_certificate: false,
    };

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/deportes/${createdSportId}`,
      payload: updatePayload,
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);

    expect(body.data.id).toBe(createdSportId);
    expect(body.data.name).toBe(testSportName);
    expect(body.data.description).toBe('Deporte E2E actualizado');
    expect(body.data.max_capacity).toBe(30);
    expect(body.data.additional_price).toBe(2500);
    expect(body.data.requires_medical_certificate).toBe(false);

    const dbSport = await prisma.sport.findUnique({
      where: { id: createdSportId },
    });

    expect(dbSport).not.toBeNull();
    expect(dbSport?.description).toBe('Deporte E2E actualizado');
    expect(dbSport?.max_capacity).toBe(30);
    expect(Number(dbSport?.additional_price)).toBe(2500);
    expect(dbSport?.requires_medical_certificate).toBe(false);
  });

  it('4. DELETE: Debe eliminar físicamente el deporte de la base de datos real', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/deportes/${createdSportId}`,
    });

    expect(response.statusCode).toBe(204);

    const dbSport = await prisma.sport.findUnique({
      where: { id: createdSportId },
    });

    expect(dbSport).toBeNull();

    createdSportId = '';
  });
});