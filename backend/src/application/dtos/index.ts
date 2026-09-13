// application/dtos/index.ts

/**
 * @file DTOs para la capa de aplicación
 * @module application/dtos
 */

// ============================================
// DTOs para la entidad User
// ============================================
export interface CreateUserInput {
  id?: string;
  name: string;
  email: string;
  password: string;
}

/**
 * @deprecated Use CreateUserInput instead. Will be removed in future versions.
 */
export const CreateActorInput = CreateUserInput;
export type CreateActorInput = CreateUserInput;

// export interface CreateActorOutput {
//   actor: Actor; // Puedes importar Actor desde domain/entities
// }

// ============================================
// DTOs para la entidad Casting
// ============================================
export interface CreateCastingInput {
  title: string;
  description: string;
  directorEmail: string;
  directorName: string;
  directorId?: string;
}

// ============================================
// DTOs para la entidad Submission
// ============================================
export interface SubmitVideoInput {
  actorId: string;
  roundId: string;
  videoUrl: string;
  videoKey?: string;
  duration?: number;
}

// ============================================
// DTOs para la entidad Round
// ============================================
export interface ManageRoundParticipantsInput {
  roundId: string;
  actors: { email: string; name?: string }[];
  preselectors: { email: string; name?: string }[];
  createNewRound?: boolean;
}

// ============================================
// DTOs para Review Submission
// ============================================
export interface ReviewSubmissionInput {
  submissionId: string;
  score: number;
  feedback?: string | null;
  directorId?: string;
}

export interface ReviewSubmissionOutput {
  id: string;
  actorId: string;
  roundId: string;
  videoUrl: string;
  status: string;
  score: number | null;
  feedback: string | null;
}

// ============================================
// DTOs para Auth
// ============================================
export interface LoginInput {
  email?: string;
  password?: string;
  xUserId?: string;
}

export interface LoginOutput {
  token: string;
  userId: string;
}

// ============================================
// DTOs para Config
// ============================================
export interface UpsertConfigInput {
  key: string;
  value: unknown;
  description?: string;
  category?: string;
  updatedBy?: string;
}

// ============================================
// Más DTOs...
// ============================================