// domain/entities/Director.ts

/**
 * @file Director.ts
 * @module domain/entities
 */

import genUUID from '../utils/genUUID';
import Email from '../value-objects/Email';
import FullName from '../value-objects/FullName';

export default class Director {
  private readonly _id: string;
  private readonly _name: FullName;
  private readonly _email: Email;

  /**
   * Private constructor for Director entity.
   * @private
   */
  private constructor(id: string, name: FullName, email: Email) {
    this._id = id;
    this._name = name;
    this._email = email;
  }

  /**
   * Static method to create a new Director instance.
   * @param {FullName} name - The name of the Director. Must not be empty.
   * @param {Email} email - The email object representing the Director's email address.
   * @param {string} [id] - Optional unique identifier for the Director.
   * @returns {Director} A new instance of Director.
   */
  static create(name: FullName, email: Email, id?: string): Director {
    const finalId = id || genUUID('director');
    return new Director(finalId, name, email);
  }

  /**
   * Gets the ID of the Director.
   * @returns {string} The unique identifier for the Director.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the name of the Director.
   * @returns {string} The name of the Director.
   */
  get name(): FullName {
    return this._name;
  }

  /**
   * Gets the email object representing the Director's email address.
   * @returns {Email} The email object for the Director.
   */
  get email(): Email {
    return this._email;
  }
}
