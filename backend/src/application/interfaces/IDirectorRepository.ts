/**
 * @file IDirectorRepository.ts
 * @module application/interfaces
 */

import Director from '../../domain/entities/Director';

/**
 * Interface for the repository operations related to directors.
 */
export default interface IDirectorRepository {
  /**
   * Finds a director by its unique identifier.
   * @param id - The unique identifier of the director.
   * @returns A Promise that resolves to the found director or null if not found.
   */
  findById(id: string): Promise<Director | null>;

  /**
   * Saves a director entity into the database.
   * @param director - The director entity to be saved.
   * @returns A Promise that resolves when the operation is completed.
   */
  save(director: Director): Promise<void>;

  /**
   * Deletes a director by its unique identifier.
   * @param id - The unique identifier of the director.
   * @returns A Promise that resolves when the deletion is completed.
   */
  delete(id: string): Promise<void>;
}
