import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './CreateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('CreateSportUseCase', () => {
  const mockSportRepo = {
    create: vi.fn(),
  } as unknown as SportRepository;

  const mockSportValidator = {
    validateNameIsRequired: vi.fn(),
    validateMaxCapacity: vi.fn(),
    validateNameIsUnique: vi.fn(),
  } as unknown as SportValidator;

  const useCase = new CreateSportUseCase(mockSportRepo, mockSportValidator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe crear un deporte si pasa las validaciones de negocio', async () => {
    const request: CreateSportRequest = {
      name: ' Fútbol ',
      description: ' Cancha de fútbol 5 ',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    };

    vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
      id: 'sport-1',
      name: 'Fútbol',
      description: 'Cancha de fútbol 5',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    });

    const result = await useCase.execute(request);

    expect(mockSportValidator.validateNameIsRequired).toHaveBeenCalledWith(' Fútbol ');
    expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(20);
    expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith(' Fútbol ');
    expect(mockSportRepo.create).toHaveBeenCalledWith({
      ...request,
      name: 'Fútbol',
      description: 'Cancha de fútbol 5',
    });
    expect(result.id).toBe('sport-1');
  });

    it('debe rechazar la creación si el nombre está vacío', async () => {
    const request: CreateSportRequest = {
      name: '   ',
      description: 'Descripción válida',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    };

    vi.mocked(mockSportValidator.validateNameIsRequired).mockImplementationOnce(() => {
      throw new Error('El nombre del deporte es obligatorio');
    });

    await expect(useCase.execute(request)).rejects.toThrow(
      'El nombre del deporte es obligatorio',
    );

    expect(mockSportValidator.validateNameIsRequired).toHaveBeenCalledWith('   ');
    expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
    expect(mockSportValidator.validateNameIsUnique).not.toHaveBeenCalled();
    expect(mockSportRepo.create).not.toHaveBeenCalled();
  });

  it('debe rechazar la creación si el cupo máximo es menor o igual a cero', async () => {
    const request: CreateSportRequest = {
      name: 'Natación',
      description: 'Pileta cubierta',
      max_capacity: 0,
      additional_price: 2000,
      requires_medical_certificate: true,
    };

    vi.mocked(mockSportValidator.validateMaxCapacity).mockImplementationOnce(() => {
      throw new Error('El cupo máximo debe ser mayor a cero');
    });

    await expect(useCase.execute(request)).rejects.toThrow(
      'El cupo máximo debe ser mayor a cero',
    );

    expect(mockSportValidator.validateNameIsRequired).toHaveBeenCalledWith('Natación');
    expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(0);
    expect(mockSportValidator.validateNameIsUnique).not.toHaveBeenCalled();
    expect(mockSportRepo.create).not.toHaveBeenCalled();
  });

  it('debe rechazar la creación si el nombre ya existe', async () => {
    const request: CreateSportRequest = {
      name: 'Fútbol',
      description: 'Cancha de fútbol 5',
      max_capacity: 20,
      additional_price: 1500,
      requires_medical_certificate: true,
    };

    vi.mocked(mockSportValidator.validateNameIsUnique).mockRejectedValueOnce(
      new Error('Ya existe un deporte con ese nombre'),
    );

    await expect(useCase.execute(request)).rejects.toThrow(
      'Ya existe un deporte con ese nombre',
    );

    expect(mockSportValidator.validateNameIsRequired).toHaveBeenCalledWith('Fútbol');
    expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(20);
    expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith('Fútbol');
    expect(mockSportRepo.create).not.toHaveBeenCalled();
  });
});
