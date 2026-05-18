import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../application/CreateLockerUseCase.js';
import { GetLockersUseCase } from '../application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from '../application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../application/DeleteLockerUseCase.js';

export class LockerController {
  constructor(
    private readonly createLockerUseCase: CreateLockerUseCase,
    private readonly getLockersUseCase: GetLockersUseCase,
    private readonly updateLockerUseCase: UpdateLockerUseCase,
    private readonly deleteLockerUseCase: DeleteLockerUseCase,
  ) {}

  async getAll(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const lockers = await this.getLockersUseCase.execute();
      return reply.status(200).send({ data: lockers });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async create(
    request: FastifyRequest<{ Body: CreateLockerRequest }>,
    reply: FastifyReply,
  ) {
    try {
      const locker = await this.createLockerUseCase.execute(request.body);
      return reply.status(201).send({ data: locker });
    } catch (error: any) {
      if (error.message.includes('Ya existe un locker con ese numero')) {
        return reply.status(409).send({ error: error.message });
      }
      if (
        error.message.includes('Debe completar') ||
        error.message.includes('mayor a cero') ||
        error.message.includes('inválido') ||
        error.message.includes('El socio no existe')
      ) {
        return reply.status(400).send({ error: error.message });
      }
      if (error.message.includes('mantenimiento')) {
        return reply.status(409).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    }
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateLockerRequest }>,
    reply: FastifyReply,
  ) {
    try {
      const { id } = request.params;
      const locker = await this.updateLockerUseCase.execute(id, request.body);
      return reply.status(200).send({ data: locker });
    } catch (error: any) {
      if (error.message.includes('Ya existe un locker con ese numero')) {
        return reply.status(409).send({ error: error.message });
      }
      if (error.message.includes('mantenimiento')) {
        return reply.status(409).send({ error: error.message });
      }
      if (
        error.message.includes('no existe') ||
        error.message.includes('Debe completar') ||
        error.message.includes('mayor a cero') ||
        error.message.includes('inválido')
      ) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { id } = request.params;
      await this.deleteLockerUseCase.execute(id);
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message.includes('no existe')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    }
  }
}
