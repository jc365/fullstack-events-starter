/**
 * @file IBitacoraRepository.ts
 * @module application/interfaces
 */

/**
 * Input for logging a bitacora event.
 */
export interface BitacoraEvent {
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  castingId?: string;
  roundId?: string;
  submissionId?: string;
}

/**
 * Interface for the repository operations related to bitacora.
 */
export default interface IBitacoraRepository {
  /**
   * Logs a business event to the bitacora.
   * @param event - The event data to log.
   * @returns A Promise that resolves when the operation is completed.
   */
  log(event: BitacoraEvent): Promise<void>;
}
