export class GetLockersUseCase {
    lockerRepo;
    constructor(lockerRepo) {
        this.lockerRepo = lockerRepo;
    }
    async execute() {
        return this.lockerRepo.findAll();
    }
}
