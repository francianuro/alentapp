export class UpdateSportUseCase {
    sportRepo;
    sportValidator;
    constructor(sportRepo, sportValidator) {
        this.sportRepo = sportRepo;
        this.sportValidator = sportValidator;
    }
    async execute(id, data) {
        const existingSport = await this.sportRepo.findById(id);
        if (!existingSport) {
            throw new Error('El deporte no existe');
        }
        this.sportValidator.validateNameIsImmutable(data);
        if (data.max_capacity !== undefined) {
            this.sportValidator.validateMaxCapacity(data.max_capacity);
        }
        return this.sportRepo.update(id, data);
    }
}
