import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEnrollmentRequest } from '@alentapp/shared';
import { CreateEnrollmentUseCase } from '../application/CreateEnrollmentUseCase.js';
import { GetEnrollmentsUseCase } from '../application/GetEnrollmentsUseCase.js';
import { DeleteEnrollmentUseCase } from '../application/DeleteEnrollmentUseCase.js';


// Registra métricas RED en cada ruta
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('apentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { 
  unit: 'ms',
}) 



export class EnrollmentController {
  constructor(
    private readonly createEnrollmentUseCase: CreateEnrollmentUseCase,
    private readonly getEnrollmentsUseCase: GetEnrollmentsUseCase,
    private readonly deleteEnrollmentUseCase: DeleteEnrollmentUseCase,
  ) {}

  async getAll(_request: FastifyRequest, reply: FastifyReply) {
    const start = Date.now();
    const method = _request.method;
    const route = _request.url.split('?')[0];

    try {
      const enrollments = await this.getEnrollmentsUseCase.execute();
      requestCounter.add(1, { method, route, status: '200' });
      return reply.status(200).send({ data: enrollments });
    } catch (error: any) {
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({ error: 'Error al obtener las inscripciones' });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }

  }

  async create(
    request: FastifyRequest<{ Body: CreateEnrollmentRequest }>,
    reply: FastifyReply,
  ) {
    try {
      const enrollment = await this.createEnrollmentUseCase.execute(request.body);
      return reply.status(201).send({ data: enrollment });
    } catch (error: any) {
      if (error.message.includes('ya está inscripto')) {
        return reply.status(409).send({ error: error.message });
      }
      if (error.message.includes('obligatorio') || error.message.includes('no existe')) {
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
      await this.deleteEnrollmentUseCase.execute(id);
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message.includes('no existe')) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
    }
  }
}
