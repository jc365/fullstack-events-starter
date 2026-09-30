/**
 * @file index.ts
 * @module infrastructure/errors
 *
 * Módulo global de errores (F4.2). Genérico y portable al starter
 * (S8): AppError + subclases + codes + errorHandler. Los códigos de
 * dominio MR (mr-codes) NO se portan; los del starter viven en
 * `starter-codes.ts`.
 */

export { default as AppError } from './AppError';
export {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalError,
} from './errors';
export * from './codes';
export * from './starter-codes';
export { errorHandler } from './errorHandler';
