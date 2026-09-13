/**
 * @file CastingTitle.ts
 * @module domain/value-objects
 *
 * Value Object que representa el título de un casting.
 * Es inmutable, validado y normalizado en el momento de la creación.
 */

export default class CastingTitle {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Crea una nueva instancia de CastingTitle.
   * @param value - Título del casting.
   * @throws {Error} Si el título está vacío, es demasiado largo,
   * o contiene caracteres no permitidos.
   */
  static create(value: string): CastingTitle {
    if (!value || value.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    if (value.trim().length > 200) {
      throw new Error('Title must be at most 200 characters');
    }
    if (/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s.,!?;:'"()-]/.test(value)) {
      throw new Error('Title contains invalid characters');
    }
    return new CastingTitle(value.trim().replace(/\s+/g, ' '));
  }

  /**
   * Devuelve el título como string normalizado.
   */
  getValue(): string {
    return this._value;
  }

  /**
   * Compara este CastingTitle con otro por valor.
   */
  equals(other: CastingTitle): boolean {
    return this._value === other._value;
  }

  /**
   * Valida si un string representa un título válido sin lanzar excepción.
   */
  static isValid(value: string): boolean {
    if (!value || value.trim().length === 0 || value.trim().length > 200) {
      return false;
    }
    return !/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s.,!?;:'"()-]/.test(value);
  }
}
