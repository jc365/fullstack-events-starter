/**
 * @file Description.ts
 * @module domain/value-objects
 *
 * Value Object que representa una descripción de casting.
 * Es inmutable y valida la longitud en el momento de la creación.
 */

export default class Description {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Crea una nueva instancia de Description.
   * @param value - Texto de la descripción.
   * @throws {Error} Si la descripción supera la longitud máxima.
   */
  static create(value: string): Description {
    if (value.length > 2000) {
      throw new Error('Description must be at most 2000 characters');
    }
    return new Description(value.trim());
  }

  /**
   * Crea una instancia vacía de Description.
   */
  static empty(): Description {
    return new Description('');
  }

  /**
   * Devuelve el valor de la descripción como string.
   */
  getValue(): string {
    return this._value;
  }

  /**
   * Indica si la descripción está vacía.
   */
  isEmpty(): boolean {
    return this._value.length === 0;
  }

  /**
   * Compara esta Description con otra por valor.
   */
  equals(other: Description): boolean {
    return this._value === other._value;
  }

  /**
   * Valida si un string representa una descripción válida sin lanzar excepción.
   */
  static isValid(value: string): boolean {
    return value.length <= 2000;
  }
}
