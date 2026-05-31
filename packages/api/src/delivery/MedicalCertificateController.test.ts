import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificateController } from './MedicalCertificateController.js';

describe('MedicalCertificateController', () => {
  // creo mocks de los cuatro casos de uso que recibe el controlador
  // en su constructor (para pprobar el controlador de forma aislada)
  const mockCreateUseCase = { execute: vi.fn() };
  const mockGetUseCase = { execute: vi.fn() };
  const mockUpdateUseCase = { execute: vi.fn() };
  const mockDeleteUseCase = { execute: vi.fn() };

  const controller = new MedicalCertificateController(
    mockCreateUseCase as any,
    mockGetUseCase as any,
    mockUpdateUseCase as any,
    mockDeleteUseCase as any,
  );

  // creo mocks de los objetos FastifyRequest y FastifyReply para simular HTTP sin necesidad de levantar un servidor
  const mockReply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };

  const mockRequest = {
    log: { info: vi.fn() },
    body: {},
    params: { id: '' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    //se comprueba que getAll devuelva status 200 con la lista de certificados dentro de un objeto data
    // se mockea el caso de uso para que retorne un arreglo, se ejecuta 
    // el metodo del controlador y se verifica el status y el body
    it('debe devolver status 200 y la lista de certificados', async () => {
      const mockList = [{ id: '1' }];
      mockGetUseCase.execute.mockResolvedValueOnce(mockList);

      await controller.getAll(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: mockList });
    });
  });

  describe('create', () => {
    // se comprueba que una creacion devuelva status 201 (exitosa)
    // con los datos del certificado creado
    // se mockea el CU para que resuelva exitosamente
    // y verifico status 201 y body 
    it('debe devolver status 201 y los datos si se crea exitosamente', async () => {
      const mockCert = { id: '1' };
      mockCreateUseCase.execute.mockResolvedValueOnce(mockCert);

      await controller.create(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({ data: mockCert });
    });

    // se comprueba que errores de validacion del CU se traduzcan en status 400
    // se mockea el CU para que tire un error y se verifica status 400
    it('debe devolver status 400 si la validación falla', async () => {
      mockCreateUseCase.execute.mockRejectedValueOnce(
        new Error('Formato de fecha inválido'),
      );

      await controller.create(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
    });
  });

  describe('update', () => {
    // comprueba que una actualizacion exitosa devuelva status 200 y los datos del certificado actualizado
    // se mockea el CU para que resuelva exitosamente
    // Se pasa un request con params.id y body VERIFICO status 200 y body.
    it('debe devolver status 200 si se actualiza correctamente', async () => {
      const mockRequestWithParams = {
        ...mockRequest,
        params: { id: 'cert-1' },
        body: { expiryDate: '2027-01-01' },
      };
      const mockCert = { id: 'cert-1' };
      mockUpdateUseCase.execute.mockResolvedValueOnce(mockCert);

      await controller.update(
        mockRequestWithParams as any,
        mockReply as any,
      );

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: mockCert });
    });
  });

  describe('delete', () => {
    // se comprueba que una eliminacion exitosa devuelva status 200 con mensaje de confirmacion
    // se mockea el CU para que resuelva undefined
    // paso un request con params.id, verifico status 200 y el mensaje
    it('debe devolver status 200 si se elimina correctamente', async () => {
      const mockRequestWithId = {
        ...mockRequest,
        params: { id: 'cert-1' },
      };
      mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

      await controller.delete(
        mockRequestWithId as any,
        mockReply as any,
      );

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Certificado eliminado correctamente',
      });
    });
  });
});