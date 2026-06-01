import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';

describe('UpdateSportUseCase', () => {
  const existingSport = {
    id: 'sport-1',
    name: 'Fútbol',
    description: 'Cancha de fútbol 5',
    max_capacity: 20,
    additional_price: 1500,
    requires_medical_certificate: true,
  };

  const mockSportRepo = {
    findById: vi.fn(),
    update: vi.fn(),
  } as unknown as SportRepository;

  const mockSportValidator = {
    validateNameIsImmutable: vi.fn(),
    validateMaxCapacity: vi.fn(),
  } as unknown as SportValidator;

  const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe actualizar los campos editables de un deporte existente', async () => {
    const updateData = {
      description: 'Nueva descripción',
      max_capacity: 30,
      additional_price: 2500,
      requires_medical_certificate: false,
    };

    vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
    vi.mocked(mockSportRepo.update).mockResolvedValueOnce({
      ...existingSport,
      ...updateData,
    });

    const result = await useCase.execute('sport-1', updateData);

    expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-1');
    expect(mockSportValidator.validateNameIsImmutable).toHaveBeenCalledWith(updateData);
    expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(30);
    expect(mockSportRepo.update).toHaveBeenCalledWith('sport-1', updateData);
    expect(result.description).toBe('Nueva descripción');
  });

  it('debe rechazar la actualización si el deporte no existe', async () => {
    vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

    await expect(useCase.execute('sport-x', { description: 'Nueva' })).rejects.toThrow('El deporte no existe');
    expect(mockSportRepo.update).not.toHaveBeenCalled();
  });

    it('debe rechazar la actualización si se intenta modificar el nombre', async () => {
    const updateData = {
      name: 'Básquet',
      description: 'Nueva descripción',
    };

    vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
    vi.mocked(mockSportValidator.validateNameIsImmutable).mockImplementationOnce(() => {
      throw new Error('El nombre del deporte no puede modificarse');
    });

    await expect(useCase.execute('sport-1', updateData as any)).rejects.toThrow(
      'El nombre del deporte no puede modificarse',
    );

    expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-1');
    expect(mockSportValidator.validateNameIsImmutable).toHaveBeenCalledWith(updateData);
    expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
    expect(mockSportRepo.update).not.toHaveBeenCalled();
  });

  it('debe rechazar la actualización si el cupo máximo es menor o igual a cero', async () => {
    const updateData = {
      description: 'Nueva descripción',
      max_capacity: 0,
      additional_price: 2500,
      requires_medical_certificate: false,
    };

    vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
    vi.mocked(mockSportValidator.validateMaxCapacity).mockImplementationOnce(() => {
      throw new Error('El cupo máximo debe ser mayor a cero');
    });

    await expect(useCase.execute('sport-1', updateData)).rejects.toThrow(
      'El cupo máximo debe ser mayor a cero',
    );

    expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-1');
    expect(mockSportValidator.validateNameIsImmutable).toHaveBeenCalledWith(updateData);
    expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(0);
    expect(mockSportRepo.update).not.toHaveBeenCalled();
  });

  it('debe permitir actualizar parcialmente solo la descripción', async () => {
    const updateData = {
      description: 'Descripción parcial actualizada',
    };

    vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);
    vi.mocked(mockSportRepo.update).mockResolvedValueOnce({
      ...existingSport,
      description: 'Descripción parcial actualizada',
    });

    const result = await useCase.execute('sport-1', updateData);

    expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-1');
    expect(mockSportValidator.validateNameIsImmutable).toHaveBeenCalledWith(updateData);
    expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
    expect(mockSportRepo.update).toHaveBeenCalledWith('sport-1', updateData);
    expect(result.description).toBe('Descripción parcial actualizada');
    expect(result.name).toBe('Fútbol');
  });
});
