export class SportValidator {
    sportRepo;
    constructor(sportRepo) {
        this.sportRepo = sportRepo;
    }
    validateNameIsRequired(name) {
        if (!name || name.trim().length === 0) {
            throw new Error('El nombre del deporte es obligatorio');
        }
    }
    async validateNameIsUnique(name) {
        const sportWithSameName = await this.sportRepo.findByName(name.trim());
        if (sportWithSameName) {
            throw new Error('Ya existe un deporte con ese nombre');
        }
    }
    validateMaxCapacity(maxCapacity) {
        if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
            throw new Error('El cupo máximo debe ser mayor a cero');
        }
    }
    validateNameIsImmutable(data) {
        if ('name' in data) {
            throw new Error('El nombre del deporte no puede modificarse');
        }
    }
}
