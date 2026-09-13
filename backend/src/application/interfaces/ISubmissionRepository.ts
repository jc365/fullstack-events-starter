/**
 * @file ISubmissionRepository.ts
 * @module application/interfaces
 */

import Submission from '../../domain/entities/Submission';

/**
 * Interface for the repository operations related to submissions.
 */
export default interface ISubmissionRepository {
  /**
   * Finds a submission by its unique identifier.
   * @param id - The unique identifier of the submission.
   * @returns A Promise that resolves to the found submission or null if not found.
   */
  findById(id: string): Promise<Submission | null>;

  /**
   * Finds all submissions for a specific round.
   * @param roundId - The unique identifier of the round.
   * @returns A Promise that resolves to an array of submissions.
   */
  findByRoundId(roundId: string): Promise<Submission[]>;

  /**
   * Finds all submissions made by a specific actor.
   * @param actorId - The unique identifier of the actor.
   * @returns A Promise that resolves to an array of submissions.
   */
  findByActorId(actorId: string): Promise<Submission[]>;

  /**
   * Saves a submission entity into the database.
   * @param submission - The submission entity to be saved.
   * @returns A Promise that resolves when the operation is completed.
   */
  save(submission: Submission): Promise<void>;

  /**
   * Deletes a submission by its unique identifier.
   * @param id - The unique identifier of the submission.
   * @returns A Promise that resolves when the deletion is completed.
   */
  delete(id: string): Promise<void>;
}
