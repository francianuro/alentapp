import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

const repositoryState = vi.hoisted(() => ({
  sports: [] as any[],
  enrollments: [] as any[],
}));

vi.hoisted(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://admin:password123@localhost:5432/alentapp_db';
});

const resetRepositoryState = () => {
  repositoryState.sports = [
    {
      id: 'sport-1',
      name: 'Fútbol',
      description: 'Cancha de fútbol 5',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    },
  ];

  repositoryState.enrollments = [];
};

vi.mock('../infrastructure/PostgresSportRepository.js', () => {
  return {
    PostgresSportRepository: class {
      async findAll() {
        return repositoryState.sports;
      }

      async findById(id: string) {
        return repositoryState.sports.find((sport) => sport.id === id) ?? null;
      }

      async findByName(name: string) {
        return (
          repositoryState.sports.find(
            (sport) => sport.name.toLowerCase() === name.trim().toLowerCase(),
          ) ?? null
        );
      }

      async create(data: CreateSportRequest) {
        const sport = {
          id: `sport-${repositoryState.sports.length + 1}`,
          ...data,
        };

        repositoryState.sports.push(sport);

        return sport;
      }

      async update(id: string, data: UpdateSportRequest) {
        const index = repositoryState.sports.findIndex((sport) => sport.id === id);

        const updatedSport = {
          ...repositoryState.sports[index],
          ...data,
        };

        repositoryState.sports[index] = updatedSport;

        return updatedSport;
      }

      async delete(id: string) {
        repositoryState.sports = repositoryState.sports.filter((sport) => sport.id !== id);
      }
    },
  };
});

vi.mock('../infrastructure/PostgresEnrollmentRepository.js', () => {
  return {
    PostgresEnrollmentRepository: class {
      async create(data: any) {
        const enrollment = {
          id: `enrollment-${repositoryState.enrollments.length + 1}`,
          member_id: data.member_id,
          sport_id: data.sport_id,
          enrollment_date: data.enrollment_date ?? new Date().toISOString(),
          is_active: true,
          member_name: data.member_id === 'member-1' ? 'Socio Existente' : undefined,
          sport_name: repositoryState.sports.find((sport) => sport.id === data.sport_id)?.name,
        };

        repositoryState.enrollments.push(enrollment);

        return enrollment;
      }

      async findAll() {
        return repositoryState.enrollments;
      }

      async findById(id: string) {
        return repositoryState.enrollments.find((enrollment) => enrollment.id === id) ?? null;
      }

      async existsBySportId(sportId: string) {
        return repositoryState.enrollments.some(
          (enrollment) => enrollment.sport_id === sportId,
        );
      }

      async existsByMemberAndSport(memberId: string, sportId: string) {
        return repositoryState.enrollments.some(
          (enrollment) =>
            enrollment.member_id === memberId && enrollment.sport_id === sportId,
        );
      }

      async delete(id: string) {
        repositoryState.enrollments = repositoryState.enrollments.filter(
          (enrollment) => enrollment.id !== id,
        );
      }
    },
  };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
  return {
    PostgresMemberRepository: class {
      async findAll() {
        return [{ id: 'member-1', name: 'Socio Existente' }];
      }

      async findById(id: string) {
        return id === 'member-1'
          ? {
              id: 'member-1',
              name: 'Socio Existente',
              dni: '12345678',
              email: 'socio@test.com',
              birthdate: '1990-01-01',
              category: 'Pleno',
              status: 'Activo',
            }
          : null;
      }

      async findByDni() {
        return null;
      }

      async create(data: any) {
        return { id: 'member-2', ...data };
      }

      async update(id: string, data: any) {
        return { id, ...data };
      }

      async delete() {
        return;
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

  beforeEach(() => {
    resetRepositoryState();
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

  it('debe rechazar la eliminación de un deporte con inscripciones asociadas', async () => {
    const enrollmentResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/inscripciones',
      payload: {
        member_id: 'member-1',
        sport_id: 'sport-1',
      },
    });

    expect(enrollmentResponse.statusCode).toBe(201);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/v1/deportes/sport-1',
    });

    expect(deleteResponse.statusCode).toBe(409);

    const deleteBody = JSON.parse(deleteResponse.payload);

    expect(deleteBody.error).toBe('No se puede eliminar un deporte con inscripciones');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/deportes',
    });

    expect(listResponse.statusCode).toBe(200);

    const listBody = JSON.parse(listResponse.payload);

    expect(listBody.data.some((sport: any) => sport.id === 'sport-1')).toBe(true);
  });
});