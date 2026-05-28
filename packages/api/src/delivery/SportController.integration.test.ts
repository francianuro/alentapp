import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

const sportRepositoryState = vi.hoisted(() => ({
  sports: [
    {
      id: 'sport-1',
      name: 'Fútbol',
      description: 'Cancha de fútbol 5',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    },
  ],
}));

vi.hoisted(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://admin:password123@localhost:5432/alentapp_db';
});

vi.mock('../infrastructure/PostgresSportRepository.js', () => {
  return {
    PostgresSportRepository: class {
      async findAll() {
        return sportRepositoryState.sports;
      }

      async findById(id: string) {
        return sportRepositoryState.sports.find((sport) => sport.id === id) ?? null;
      }

      async findByName(name: string) {
        return (
          sportRepositoryState.sports.find(
            (sport) => sport.name.toLowerCase() === name.trim().toLowerCase(),
          ) ?? null
        );
      }

      async create(data: CreateSportRequest) {
        const sport = {
          id: `sport-${sportRepositoryState.sports.length + 1}`,
          ...data,
        };

        sportRepositoryState.sports.push(sport);

        return sport;
      }

      async update(id: string, data: UpdateSportRequest) {
        const index = sportRepositoryState.sports.findIndex((sport) => sport.id === id);

        const updatedSport = {
          ...sportRepositoryState.sports[index],
          ...data,
        };

        sportRepositoryState.sports[index] = updatedSport;

        return updatedSport;
      }

      async delete(id: string) {
        sportRepositoryState.sports = sportRepositoryState.sports.filter(
          (sport) => sport.id !== id,
        );
      }
    },
  };
});

vi.mock('../infrastructure/PostgresEnrollmentRepository.js', () => {
  return {
    PostgresEnrollmentRepository: class {
      async existsBySportId() {
        return false;
      }

      async findAll() {
        return [];
      }
    },
  };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
  return {
    PostgresMemberRepository: class {
      async findById() {
        return null;
      }

      async findByDni() {
        return null;
      }

      async findAll() {
        return [];
      }
    },
  };
});

vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => {
  return {
    PostgresMedicalCertificateRepository: class {
      async findAll() {
        return [];
      }
    },
  };
});

vi.mock('../infrastructure/PostgresPaymentRepository.ts', () => {
  return {
    PostgresPaymentRepository: class {
      async findAll() {
        return [];
      }
    },
  };
});

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
  return {
    PostgresLockerRepository: class {
      async findAll() {
        return [];
      }

      async findByNumber() {
        return null;
      }
    },
  };
});

const { buildApp } = await import('../app.js');

describe('Sport API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('debe crear, listar y actualizar un deporte mediante la API', async () => {
    const createPayload: CreateSportRequest = {
      name: ' Básquet ',
      description: ' Cancha techada ',
      max_capacity: 15,
      additional_price: 1200,
      requires_medical_certificate: false,
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/deportes',
      payload: createPayload,
    });

    expect(createResponse.statusCode).toBe(201);

    const createdBody = JSON.parse(createResponse.payload);

    expect(createdBody.data.id).toBe('sport-2');
    expect(createdBody.data.name).toBe('Básquet');
    expect(createdBody.data.description).toBe('Cancha techada');
    expect(createdBody.data.max_capacity).toBe(15);
    expect(createdBody.data.additional_price).toBe(1200);
    expect(createdBody.data.requires_medical_certificate).toBe(false);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/deportes',
    });

    expect(listResponse.statusCode).toBe(200);

    const listBody = JSON.parse(listResponse.payload);

    expect(listBody.data).toHaveLength(2);
    expect(listBody.data.some((sport: any) => sport.name === 'Básquet')).toBe(true);

    const updatePayload: UpdateSportRequest = {
      description: 'Cancha cubierta principal',
      max_capacity: 25,
      additional_price: 1800,
      requires_medical_certificate: true,
    };

    const updateResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/deportes/sport-2',
      payload: updatePayload,
    });

    expect(updateResponse.statusCode).toBe(200);

    const updatedBody = JSON.parse(updateResponse.payload);

    expect(updatedBody.data.id).toBe('sport-2');
    expect(updatedBody.data.name).toBe('Básquet');
    expect(updatedBody.data.description).toBe('Cancha cubierta principal');
    expect(updatedBody.data.max_capacity).toBe(25);
    expect(updatedBody.data.additional_price).toBe(1800);
    expect(updatedBody.data.requires_medical_certificate).toBe(true);
  });
});