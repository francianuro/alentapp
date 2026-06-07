export class GetSportsUseCase {
    sportRepo;
    constructor(sportRepo) {
        this.sportRepo = sportRepo;
    }
    async execute() {
        return this.sportRepo.findAll();
    }
}
