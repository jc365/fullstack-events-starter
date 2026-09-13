/**
 * @file Score.ts
 * @module domain/value-objects
 * 
 * Value Object que representa la puntuación (0-10) de una submission.
 * Es inmutable y puede estar ausente (no evaluado aún).
 */
export default class Score {
  private readonly _value: number | null;

  private constructor(value: number | null) {
    this._value = value;
  }

  /**
   * Crea una nueva instancia de Score con un valor numérico.
   * @param value - Puntuación entre 0 y 10.
   * @throws {Error} Si el valor está fuera del rango permitido.
   */
  static create(value: number): Score {
    if (!Score.isValid(value)) {
      throw new Error(`Score must be between 0 and 10, got ${value}`);
    }
    return new Score(value);
  }

  /**
   * Crea una instancia de Score que representa "sin evaluar".
   */
  static none(): Score {
    return new Score(null);
  }

  /**
   * Devuelve el valor numérico o null si no está evaluado.
   */
  getValue(): number | null {
    return this._value;
  }

  /**
   * Indica si la puntuación ha sido asignada.
   */
  isPresent(): boolean {
    return this._value !== null;
  }

  /**
   * Compara si esta puntuación es mayor que otra.
   * @throws {Error} Si alguna de las puntuaciones no está presente.
   */
  isHigherThan(other: Score): boolean {
    if (!this.isPresent() || !other.isPresent()) {
      throw new Error('Cannot compare scores when one is not present');
    }
    return (this._value as number) > (other._value as number);
  }

  /**
   * Determina si la puntuación supera un umbral.
   * @param threshold - Valor mínimo para aprobar (por defecto 5).
   */
  isPassing(threshold: number = 5): boolean {
    if (!this.isPresent()) return false;
    return (this._value as number) >= threshold;
  }

  /**
   * Convierte la puntuación a una letra de calificación.
   * - 0-5 → "F"
   * - 6-7 → "C"
   * - 8-9 → "B"
   * - 10  → "A"
   * @throws {Error} Si la puntuación no está presente.
   */
  toGrade(): string {
    if (!this.isPresent()) {
      throw new Error('Cannot convert to grade when score is not present');
    }
    const v = this._value as number;
    if (v <= 5) return 'F';
    if (v <= 7) return 'C';
    if (v <= 9) return 'B';
    return 'A';
  }

  /**
   * Compara si dos Scores son iguales (incluyendo ambos ausentes).
   */
  equals(other: Score): boolean {
    return this._value === other._value;
  }

  /**
   * Valida que un número esté entre 0 y 10.
   * @param value - Número a validar.
   */
  static isValid(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 10;
  }
}
