export class DeleteLockerUseCase {
    lockerRepo;
    constructor(lockerRepo) {
        this.lockerRepo = lockerRepo;
    }
    async execute(id) {
        const existingLocker = await this.lockerRepo.findById(id);
        if (!existingLocker) {
            throw new Error('El locker no existe');
        }
        await this.lockerRepo.delete(id);
    }
}
