/**
 * @file Feedback.ts
 * @module domain/value-objects
 *
 * Value Object que representa el feedback textual de una submission.
 * Es inmutable, puede estar ausente (no evaluado aún),
 * y se sanitiza contra XSS en el momento de la creación.
 */
export default class Feedback {
  private readonly _value: string | null;

  private constructor(value: string | null) {
    this._value = value;
  }

  /**
   * Crea una nueva instancia de Feedback con un texto.
   * @param value - Texto de retroalimentación.
   * @throws {Error} Si el texto supera los 500 caracteres o contiene HTML.
   */
  static create(value: string): Feedback {
    if (!Feedback.isValid(value)) {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        throw new Error('Feedback cannot be empty');
      }
      if (trimmed.length > 500) {
        throw new Error('Feedback must be at most 500 characters');
      }
      if (/<[a-z][\s\S]*>/i.test(trimmed)) {
        throw new Error('Feedback cannot contain HTML tags');
      }
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    return new Feedback(normalized);
  }

  /**
   * Crea una instancia de Feedback que representa "sin feedback".
   */
  static none(): Feedback {
    return new Feedback(null);
  }

  /**
   * Devuelve el texto o null si no hay feedback.
   */
  getValue(): string | null {
    return this._value;
  }

  /**
   * Indica si el feedback ha sido asignado.
   */
  isPresent(): boolean {
    return this._value !== null;
  }

  /**
   * Cuenta el número de palabras del feedback.
   * @throws {Error} Si el feedback no está presente.
   */
  wordCount(): number {
    if (!this.isPresent()) {
      throw new Error('Cannot count words when feedback is not present');
    }
    return (this._value as string).split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Trunca el feedback a una longitud máxima, sin cortar palabras.
   * @param maxLength - Longitud máxima del texto truncado.
   * @throws {Error} Si el feedback no está presente.
   */
  truncate(maxLength: number): Feedback {
    if (!this.isPresent()) {
      throw new Error('Cannot truncate when feedback is not present');
    }
    const text = this._value as string;
    if (text.length <= maxLength) {
      return new Feedback(text);
    }

    // Busca el último espacio dentro del límite
    let truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }
    // Si no hay espacio, cortamos exactamente en el límite
    return new Feedback(truncated);
  }
  
  /**
   * Compara si dos Feedback son iguales (incluyendo ambos ausentes).
   */
  equals(other: Feedback): boolean {
    return this._value === other._value;
  }

  /**
   * Valida que un string sea un feedback válido sin lanzar excepción.
   * @param value - Texto a validar.
   */
  static isValid(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > 500) return false;
    if (/<[a-z][\s\S]*>/i.test(trimmed)) return false;
    return true;
  }
}
