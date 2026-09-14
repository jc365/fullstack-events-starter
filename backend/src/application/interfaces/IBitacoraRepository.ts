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
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for the repository operations related to bitacora.
 */
export default interface IBitacoraRepository {
  /**
   * Logs a business event to the bitacora.
   */
  log(event: BitacoraEvent): Promise<void>;
}
