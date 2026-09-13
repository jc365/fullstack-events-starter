/**
 * @file ICastingRepository.ts
 * @module application/interfaces
 */

import Casting from '../../domain/entities/Casting';

/**
 * Interface for the repository operations related to castings.
 */
export default interface ICastingRepository {
  /**
   * Finds a casting by its unique identifier.
   * @param id - The unique identifier of the casting.
   * @returns A Promise that resolves to the found casting or null if not found.
   */
  findById(id: string): Promise<Casting | null>;

  /**
   * Finds all castings.
   * @returns A Promise that resolves to an array of all castings.
   */
  findAll(): Promise<Casting[]>;

  /**
   * Saves a casting entity into the database.
   * @param casting - The casting entity to be saved.
   * @returns A Promise that resolves when the operation is completed.
   */
  save(casting: Casting): Promise<void>;

  /**
   * Deletes a casting by its unique identifier.
   * @param id - The unique identifier of the casting.
   * @returns A Promise that resolves when the deletion is completed.
   */
  delete(id: string): Promise<void>;
}
