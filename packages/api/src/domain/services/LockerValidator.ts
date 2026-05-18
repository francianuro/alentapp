import { LockerStatus } from '@alentapp/shared';
import { LockerRepository } from '../LockerRepository.js';

const VALID_LOCKER_STATUSES: LockerStatus[] = ['Available', 'Occupied', 'Maintenance'];

export class LockerValidator {
  constructor(private readonly lockerRepo: LockerRepository) {}

  validateRequiredFields(data: { number?: number; location?: string }): void {
    if (data.number === undefined || data.number === null || !data.location || data.location.trim().length === 0) {
      throw new Error('Debe completar todos los campos');
    }
  }

  validateNumber(number: number): void {
    if (!Number.isInteger(number) || number <= 0) {
      throw new Error('El número de locker debe ser mayor a cero');
    }
  }

  validateStatus(status: LockerStatus): void {
    if (!VALID_LOCKER_STATUSES.includes(status)) {
      throw new Error('Estado de locker inválido');
    }
  }

  async validateNumberIsUnique(number: number, excludeLockerId?: string): Promise<void> {
    const lockerWithSameNumber = await this.lockerRepo.findByNumber(number);
    if (lockerWithSameNumber && lockerWithSameNumber.id !== excludeLockerId) {
      throw new Error('Ya existe un locker con ese numero');
    }
  }

  validateMemberAssignment(status: LockerStatus, memberId?: string | null): void {
    if (status === 'Maintenance' && memberId) {
      throw new Error('No se puede asignar un casillero en mantenimiento');
    }
  }
}
