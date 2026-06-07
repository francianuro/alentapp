import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../application/CreateLockerUseCase.js';
import { GetLockersUseCase } from '../application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from '../application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../application/DeleteLockerUseCase.js';

// Registra métricas RED en cada ruta
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('apentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { 
  unit: 'ms',
});

export class LockerController {
  constructor(
    private readonly createLockerUseCase: CreateLockerUseCase,
    private readonly getLockersUseCase: GetLockersUseCase,
    private readonly updateLockerUseCase: UpdateLockerUseCase,
    private readonly deleteLockerUseCase: DeleteLockerUseCase,
  ) {}

  async getAll(_request: FastifyRequest, reply: FastifyReply) {
    const start = Date.now();
    const method = _request.method;
    const route = _request.url.split('?')[0];

    try {
      const lockers = await this.getLockersUseCase.execute();

      requestCounter.add(1, { method, route, status: '200' });
      return reply.status(200).send({ data: lockers });
    } catch (error: any) {
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({ error: error.message });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async create(
    request: FastifyRequest<{ Body: CreateLockerRequest }>,
    reply: FastifyReply,
  ) {
    const start = Date.now();
    const method = request.method;
    const route = request.url.split('?')[0];

    try {
      const locker = await this.createLockerUseCase.execute(request.body);

      requestCounter.add(1, { method, route, status: '201' });

      return reply.status(201).send({ data: locker });
    } catch (error: any) {
      if (error.message.includes('Ya existe un locker con ese numero')) {
        errorCounter.add(1, { method, route, status: '409' });
        return reply.status(409).send({ error: error.message });
      }
      if (
        error.message.includes('Debe completar') ||
        error.message.includes('mayor a cero') ||
        error.message.includes('inválido') ||
        error.message.includes('El socio no existe')
      ) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: error.message });
      }
      if (error.message.includes('mantenimiento')) {
        errorCounter.add(1, { method, route, status: '409' });
        return reply.status(409).send({ error: error.message });
      }
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateLockerRequest }>,
    reply: FastifyReply,
  ) {
    const start = Date.now();
    const method = request.method;
    const route = request.url.split('?')[0];

    try {
      const { id } = request.params;
      const locker = await this.updateLockerUseCase.execute(id, request.body);

      requestCounter.add(1, { method, route, status: '200' });

      return reply.status(200).send({ data: locker });
    } catch (error: any) {
      if (error.message.includes('Ya existe un locker con ese numero')) {
        errorCounter.add(1, { method, route, status: '409' });
        return reply.status(409).send({ error: error.message });
      }
      if (error.message.includes('mantenimiento')) {
        errorCounter.add(1, { method, route, status: '409' });
        return reply.status(409).send({ error: error.message });
      }
      if (
        error.message.includes('no existe') ||
        error.message.includes('Debe completar') ||
        error.message.includes('mayor a cero') ||
        error.message.includes('inválido')
      ) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: error.message });
      }
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const start = Date.now();
    const method = request.method;
    const route = request.url.split('?')[0];

    try {
      const { id } = request.params;
      await this.deleteLockerUseCase.execute(id);

      requestCounter.add(1, { method, route, status: '204' });

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message.includes('no existe')) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(404).send({ error: error.message });
      }
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }
}
