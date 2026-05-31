import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetMedicalCertificatesUseCase } from './GetMedicalCertificateUseCase.js';
import type { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

describe('GetMedicalCertificatesUseCase', () => {
  // Se crea un mock del repositorio con el metodo findAll
  const mockMedCertRepo = {
    findAll: vi.fn(),
  } as unknown as MedicalCertificateRepository;

  const useCase = new GetMedicalCertificatesUseCase(mockMedCertRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // se comprueba que el CU  retorne la lista completa de certificados no eliminados
  // que devuelve el repositorio
  // se mockea findAll para que retorne un arreglo de dos certificados
  // ejecuta el CU y  verifica que el resultado coincida con el arreglo mockeado y 
  // que findAll se haya llamado una sola vez 

  it('debe retornar la lista de certificados', async () => {
    const mockList = [{ id: '1' }, { id: '2' }] as any;
    vi.mocked(mockMedCertRepo.findAll).mockResolvedValueOnce(mockList);

    const result = await useCase.execute();

    expect(result).toEqual(mockList);
    expect(mockMedCertRepo.findAll).toHaveBeenCalledOnce();
  });
});