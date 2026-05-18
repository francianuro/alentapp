import { LockerDTO } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';

export class GetLockersUseCase {
  constructor(private readonly lockerRepo: LockerRepository) {}

  async execute(): Promise<LockerDTO[]> {
    return this.lockerRepo.findAll();
  }
}
