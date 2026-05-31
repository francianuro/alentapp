import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';

// mockeamos el repo de certificados medicos para que la API funcione sin conectarse a la bd real
//permite testear el ciclo completo (Fastify -> Controller -> UseCase -> Validator)
vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => {
  return {
    PostgresMedicalCertificateRepository: class {
      async findAll() {
        return [
          {
            id: 'cert-1',
            memberId: 'mem-1',
            issueDate: '2026-01-01',
            expiryDate: '2026-12-31',
            doctorLicense: 'LIC-001',
            isValidated: true,
            deletedAt: null,
          },
        ];
      }

      async findById(id: string) {
        const certificates: Record<string, any> = {
          'cert-1': {
            id: 'cert-1',
            memberId: 'mem-1',
            issueDate: '2026-01-01',
            expiryDate: '2026-12-31',
            doctorLicense: 'LIC-001',
            isValidated: true,
            deletedAt: null,
          },
          'cert-2': {
            id: 'cert-2',
            memberId: 'mem-1',
            issueDate: '2026-03-01',
            expiryDate: '2026-09-01',
            doctorLicense: 'LIC-002',
            isValidated: false,
            deletedAt: null,
          },
        };
        return certificates[id] || null;
      }

      async create(data: any) {
        return {
          id: 'cert-new',
          ...data,
          issueDate: new Date().toISOString(),
          isValidated: true,
          deletedAt: null,
        };
      }

      async update(id: string, data: any) {
        return {
          id,
          memberId: 'mem-1',
          issueDate: '2026-01-01',
          doctorLicense: 'LIC-001',
          isValidated: false,
          deletedAt: null,
          ...data,
        };
      }

      async delete(_id: string) {
        return;
      }

      async invalidatePreviousCertificates(_memberId: string) {
        return;
      }
    },
  };
});

// Mockeamos el repositorio de socios porque CreateMedicalCertificateUseCase
// verifica la existencia del socio antes de crear el certificado.
vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
  return {
    PostgresMemberRepository: class {
      async findById(id: string) {
        return id === 'mem-1'
          ? { id: 'mem-1', name: 'Socio Existente' }
          : null;
      }
    },
  };
});

describe('MedicalCertificate API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/certificados-medicos', () => {
    // se comprueba que el endpoint retorne status 200 con el listado de certificados que
    // devuelve findAll del repositorio mockeado
    // se envia GET sin parametros, se verifica status 200
    // y que el body.data sea un arreglo con el certificado mockeado
    it('debe retornar código 200 y el listado de certificados', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/certificados-medicos',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data[0].id).toBe('cert-1');
      expect(body.data[0].doctorLicense).toBe('LIC-001');
    });
  });

  describe('POST /api/v1/certificados-medicos', () => {
    // se comprueba que la creacion de un certificado con datos
    // validos retorne status 201 y los datos del certificado creado
    // se envía un POST con memberId existente ('mem-1') expiryDate futura y doctorLicense
    // el mock de findById del MemberRepo retorna el socio, el validador aprueba 
    // y el repositorio mockeado crea el certificado
    // se verifica status 201 y que id y expiryDate esten en la rta
    it('debe retornar 201 y crear el certificado médico', async () => {
      const payload = {
        memberId: 'mem-1',
        expiryDate: '2027-06-01',
        doctorLicense: 'LIC-NEW',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/certificados-medicos',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.id).toBeDefined();
      expect(body.data.expiryDate).toBe('2027-06-01');
    });

    // se comprueba que el endpoint retorne status 400 cuando envio un memberId vacío
    // (validación ocurre en la capa de dominio MedicalCertificateValidator, el controller traduce a HTTP
    // se envía un POST con memberId vacio, el validador tira error
    // y el controller responde con 400
    it('debe retornar 400 si memberId está vacío', async () => {
      const payload = {
        memberId: '',
        expiryDate: '2027-06-01',
        doctorLicense: 'LIC-001',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/certificados-medicos',
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('El campo memberId es obligatorio');
    });

    // se comprueba que el endpoint retorne status 404 cuando
    // el socio indicado en memberId no existe en la bd
    // se envía un POST con un memberId que no existe, el validador de fechas pasa,
    // pero el CU al buscar el socio recibe null (del MemberRepository mockeado)
    //  y tira el error
    // el controller traduce a 404 
    it('debe retornar 404 si el socio no existe', async () => {
      const payload = {
        memberId: 'no-existe',
        expiryDate: '2027-06-01',
        doctorLicense: 'LIC-001',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/certificados-medicos',
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('El socio no existe');
    });
  });

  describe('PUT /api/v1/certificados-medicos/:id', () => {
    // se comprueba que la actualizacion de un certificado
    // existente retorne status 200 con los datos actualizados
    // se envía un PUT a /api/v1/certificados-medicos/cert-1
    // con una nueva expiryDate 
    // el mock de findById retorna el certificado
    // el validador de fechas aprueba y el repositorio aplica el cambio
    // se verifica status 200 y la expiryDate actualizada en la rta
    it('debe retornar 200 y actualizar el certificado', async () => {
      const payload = {
        expiryDate: '2027-01-01',
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/certificados-medicos/cert-1',
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.id).toBe('cert-1');
      expect(body.data.expiryDate).toBe('2027-01-01');
    });
  });

  describe('DELETE /api/v1/certificados-medicos/:id', () => {
    // se comprueba que la eliminacion logica de un certificado
    // no validado retorne status 200 con el mensaje de confirmacion
    // se envía un DELETE a /api/v1/certificados-medicos/cert-2
    // (certificado con isValidated=false en el mock)
    // el CU verifica que existe y que no está validado
    // luego llama a delete del repo
    // Se verifica status 200 y el mensaje 
    it('debe retornar 200 y eliminar el certificado', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/certificados-medicos/cert-2',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe('Certificado eliminado correctamente');
    });
  });
});