export class CreateSportUseCase {
    sportRepo;
    sportValidator;
    constructor(sportRepo, sportValidator) {
        this.sportRepo = sportRepo;
        this.sportValidator = sportValidator;
    }
    async execute(data) {
        this.sportValidator.validateNameIsRequired(data.name);
        this.sportValidator.validateMaxCapacity(data.max_capacity);
        await this.sportValidator.validateNameIsUnique(data.name);
        return this.sportRepo.create({
            ...data,
            name: data.name.trim(),
            description: data.description.trim(),
        });
    }
}
