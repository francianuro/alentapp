import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalCertificateValidator } from './MedicalCertificateValidator.js';

describe('MedicalCertificateValidator', () => {
  const validator = new MedicalCertificateValidator();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validate', () => {
    // se verifica que el metodo validate no lance errores
    // cuando se proporcionan un memberId válido y una expiryDate futura
    // se construye una fecha futura (24h después de ahora)
    // y se pasa junto con un UUID de socio. Se espera que no haya excepción
    it('debe pasar si memberId y expiryDate son válidos y la fecha es futura', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      expect(() =>
        validator.validate({ memberId: 'uuid-1', expiryDate: future })
      ).not.toThrow();
    });

    // se comprueba que el validador rechace un memberId vacio
    // se pasa una cadena vacía como memberId con una fecha futura válida
    it('debe lanzar error si memberId está vacío', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      expect(() =>
        validator.validate({ memberId: '', expiryDate: future })
      ).toThrow('El campo memberId es obligatorio');
    });

    // se verifica que el validador rechace formatos de fecha invalidos
    // se pasa una cadena no convertible a Date como expiryDate
    it('debe lanzar error si expiryDate tiene formato inválido', () => {
      expect(() =>
        validator.validate({ memberId: 'uuid-1', expiryDate: 'no-una-fecha' })
      ).toThrow('Formato de fecha inválido');
    });

    // se comprueba que la expiryDate debe ser posterior a la emisión
    // se pasa una fecha 24h antes de ahora

    it('debe lanzar error si expiryDate es menor o igual a la fecha actual', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      expect(() =>
        validator.validate({ memberId: 'uuid-1', expiryDate: past })
      ).toThrow('La fecha de vencimiento debe ser posterior a la de emisión');
    });
  });

  describe('validateUpdate', () => {
    // se verifica que validateUpdate acepte una fecha futura
    // cuando la expiryDate proporcionada es posterior a la issueDate existente
    // se crea una issueDate fija 2026-01-01 y se pasa una
    // expiryDate posterior no debe lanzar excepción
    it('debe pasar si expiryDate es válido y posterior a la fecha de emisión', () => {
      const issueDate = new Date('2026-01-01');
      const future = new Date('2026-06-01').toISOString();
      expect(() =>
        validator.validateUpdate({ expiryDate: future }, issueDate)
      ).not.toThrow();
    });

    // se comprueba que validateUpdate rechace un expiryDate vacio
    // se pasa una cadena vacia como expiryDate

    it('debe lanzar error si expiryDate es inválido en la actualización', () => {
      const issueDate = new Date('2026-01-01');
      expect(() =>
        validator.validateUpdate({ expiryDate: '' }, issueDate)
      ).toThrow('Formato de fecha inválido');
    });
  });
});