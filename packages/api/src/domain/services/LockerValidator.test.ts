import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockerValidator } from './LockerValidator.js';
import { LockerRepository } from '../LockerRepository.js';

describe('LockerValidator', () => {
    const mockLockerRepo = {
        findByNumber: vi.fn(),
    } as unknown as LockerRepository;

    const validator = new LockerValidator(mockLockerRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateRequiredFields', () => {
        it('debe pasar si number y location están completos', () => {
            expect(() => validator.validateRequiredFields({ number: 101, location: 'Vestuario' })).not.toThrow();
        });

        it('debe lanzar error si falta number, location o location está vacío', () => {
            expect(() => validator.validateRequiredFields({ location: 'Vestuario' })).toThrow('Debe completar todos los campos');
            expect(() => validator.validateRequiredFields({ number: 101 })).toThrow('Debe completar todos los campos');
            expect(() => validator.validateRequiredFields({ number: 101, location: '   ' })).toThrow('Debe completar todos los campos');
        });
    });

    describe('validateNumber', () => {
        it('debe pasar si el número es un entero positivo', () => {
            expect(() => validator.validateNumber(1)).not.toThrow();
            expect(() => validator.validateNumber(101)).not.toThrow();
        });

        it('debe lanzar error si el número es cero, negativo o decimal', () => {
            expect(() => validator.validateNumber(0)).toThrow('El número de locker debe ser mayor a cero');
            expect(() => validator.validateNumber(-5)).toThrow('El número de locker debe ser mayor a cero');
            expect(() => validator.validateNumber(1.5)).toThrow('El número de locker debe ser mayor a cero');
        });
    });

    describe('validateStatus', () => {
        it('debe pasar con estados válidos', () => {
            expect(() => validator.validateStatus('Available')).not.toThrow();
            expect(() => validator.validateStatus('Occupied')).not.toThrow();
            expect(() => validator.validateStatus('Maintenance')).not.toThrow();
        });

        it('debe lanzar error con un estado inválido', () => {
            expect(() => validator.validateStatus('Broken' as any)).toThrow('Estado de locker inválido');
        });
    });

    describe('validateNumberIsUnique', () => {
        it('debe pasar si el número no existe en la base de datos', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(null);

            await expect(validator.validateNumberIsUnique(101)).resolves.not.toThrow();
            expect(mockLockerRepo.findByNumber).toHaveBeenCalledWith(101);
        });

        it('debe pasar si el número existe pero pertenece al mismo locker (caso de edición)', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce({ id: 'locker-1', number: 101 } as any);

            await expect(validator.validateNumberIsUnique(101, 'locker-1')).resolves.not.toThrow();
        });

        it('debe lanzar error si el número existe y pertenece a otro locker', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce({ id: 'locker-2', number: 101 } as any);

            await expect(validator.validateNumberIsUnique(101, 'locker-1')).rejects.toThrow('Ya existe un locker con ese numero');
        });
    });

    describe('validateMemberAssignment', () => {
        it('debe pasar si el locker está disponible u ocupado con socio', () => {
            expect(() => validator.validateMemberAssignment('Available', null)).not.toThrow();
            expect(() => validator.validateMemberAssignment('Occupied', 'member-1')).not.toThrow();
        });

        it('debe lanzar error si se asigna un socio a un locker en mantenimiento', () => {
            expect(() => validator.validateMemberAssignment('Maintenance', 'member-1')).toThrow(
                'No se puede asignar un casillero en mantenimiento'
            );
        });
    });
});
