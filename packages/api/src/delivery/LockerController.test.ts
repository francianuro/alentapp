import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockerController } from './LockerController.js';

describe('LockerController', () => {
    const mockCreateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };

    const controller = new LockerController(
        mockCreateUseCase as any,
        mockGetUseCase as any,
        mockUpdateUseCase as any,
        mockDeleteUseCase as any,
    );

    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const mockRequest = {
        log: { info: vi.fn() },
        body: { number: 101, location: 'Vestuario principal' },
        params: { id: '123' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockLocker = { id: '1', number: 101, location: 'Vestuario principal', status: 'Available' };
            mockCreateUseCase.execute.mockResolvedValueOnce(mockLocker);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockCreateUseCase.execute).toHaveBeenCalledWith(mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLocker });
        });

        it('debe devolver status 409 Conflict si el número ya existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Ya existe un locker con ese numero'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un locker con ese numero' });
        });

        it('debe devolver status 409 Conflict si se asigna socio a locker en mantenimiento', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede asignar un casillero en mantenimiento'),
            );

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'No se puede asignar un casillero en mantenimiento',
            });
        });

        it('debe devolver status 400 Bad Request si faltan campos obligatorios', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Debe completar todos los campos'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Debe completar todos los campos' });
        });

        it('debe devolver status 400 Bad Request si el número es inválido', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El número de locker debe ser mayor a cero'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe devolver status 400 Bad Request si el socio no existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver status 500 para cualquier otro error', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Error de conexion de Prisma...'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockDeleteUseCase.execute).toHaveBeenCalledWith('123');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 404 si el locker no existe', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('El locker no existe'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El locker no existe' });
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('DB Falló'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de lockers', async () => {
            const mockLockers = [
                { id: '1', number: 101, location: 'Vestuario' },
                { id: '2', number: 102, location: 'Hall' },
            ];
            mockGetUseCase.execute.mockResolvedValueOnce(mockLockers);

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLockers });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            mockGetUseCase.execute.mockRejectedValueOnce(new Error('DB Falló'));

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB Falló' });
        });
    });

    describe('update', () => {
        it('debe devolver status 200 y los datos si se actualiza correctamente', async () => {
            const mockLocker = { id: '123', number: 102, location: 'Vestuario secundario', status: 'Occupied' };
            mockUpdateUseCase.execute.mockResolvedValueOnce(mockLocker);

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('123', mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLocker });
        });

        it('debe devolver status 409 Conflict si el nuevo número ya existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Ya existe un locker con ese numero'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        it('debe devolver status 409 Conflict si se asigna socio a locker en mantenimiento', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede asignar un casillero en mantenimiento'),
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        it('debe devolver status 400 si el locker no existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El locker no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El locker no existe' });
        });

        it('debe devolver status 400 si el número es inválido', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El número de locker debe ser mayor a cero'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});
