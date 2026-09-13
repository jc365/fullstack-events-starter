// domain/entities/User.ts

/**
 * @file User.ts
 * @module domain/entities
 */

import genUUID from '../utils/genUUID';
import Email from '../value-objects/Email';
import FullName from '../value-objects/FullName';

export class User {
  private readonly _id: string;
  private readonly _name: FullName;
  private readonly _email: Email;
  private readonly _password: string;
  private readonly _submissions: any[];

  private constructor(id: string, name: FullName, email: Email, password: string, submissions: any[]) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._password = password;
    this._submissions = submissions;
  }

  /**
   * @static
   * @param {FullName} name - Name of the User.
   * @param {Email} email - Email address of the User.
   * @param {string} password - Hashed password of the User.
   * @param {string} [id] - Optional unique identifier for the User.
   * @returns {User} - A new instance of User.
   */
  static create(name: FullName, email: Email, password: string, id?: string): User {
    const finalId = id || genUUID('usr');
    return new User(finalId, name, email, password, []);
  }

  /**
   * @returns {string} - User's unique identifier.
   */
  get id(): string {
    return this._id;
  }

  /**
   * @returns {string} - User's name.
   */
  get name(): FullName {
    return this._name;
  }

  /**
   * @returns {Email} - User's email address.
   */
  get email(): Email {
    return this._email;
  }

  /**
   * @returns {string} - User's hashed password.
   */
  get password(): string {
    return this._password;
  }

  /**
   * @returns {any[]} - Array of submissions (temporal).
   */
  get submissions(): any[] {
    return this._submissions;
  }
}

export default User;

/**
 * @deprecated Use User instead. Will be removed in future versions.
 */
export const Actor = User;
export type Actor = User;
