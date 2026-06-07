const VALID_LOCKER_STATUSES = ['Available', 'Occupied', 'Maintenance'];
export class LockerValidator {
    lockerRepo;
    constructor(lockerRepo) {
        this.lockerRepo = lockerRepo;
    }
    validateRequiredFields(data) {
        if (data.number === undefined || data.number === null || !data.location || data.location.trim().length === 0) {
            throw new Error('Debe completar todos los campos');
        }
    }
    validateNumber(number) {
        if (!Number.isInteger(number) || number <= 0) {
            throw new Error('El número de locker debe ser mayor a cero');
        }
    }
    validateStatus(status) {
        if (!VALID_LOCKER_STATUSES.includes(status)) {
            throw new Error('Estado de locker inválido');
        }
    }
    async validateNumberIsUnique(number, excludeLockerId) {
        const lockerWithSameNumber = await this.lockerRepo.findByNumber(number);
        if (lockerWithSameNumber && lockerWithSameNumber.id !== excludeLockerId) {
            throw new Error('Ya existe un locker con ese numero');
        }
    }
    validateMemberAssignment(status, memberId) {
        if (status === 'Maintenance' && memberId) {
            throw new Error('No se puede asignar un casillero en mantenimiento');
        }
    }
}
