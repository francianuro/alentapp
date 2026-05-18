import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteLockerUseCase {
  constructor(private readonly lockerRepo: LockerRepository) {}

  async execute(id: string): Promise<void> {
    const existingLocker = await this.lockerRepo.findById(id);
    if (!existingLocker) {
      throw new Error('El locker no existe');
    }

    await this.lockerRepo.delete(id);
  }
}
