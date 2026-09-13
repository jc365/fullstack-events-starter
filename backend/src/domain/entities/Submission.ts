// domain/entities/Submission.ts

/**
 * @file Submission.ts
 * @module domain/entities
 */

import Feedback from '../value-objects/Feedback';
import Score from '../value-objects/Score';
import VideoUrl from '../value-objects/VideoUrl';
import genUUID from '../utils/genUUID';

export type SubmissionStatus = 'pending' | 'reviewed' | 'selected' | 'rejected';

export default class Submission {
  private readonly _id: string;
  private readonly _actorId: string;
  private readonly _roundId: string;
  private readonly _videoUrl: VideoUrl;
  private readonly _videoKey: string | null;
  private readonly _duration: number | null;
  private readonly _status: SubmissionStatus;
  private readonly _score: Score;
  private readonly _feedback: Feedback;

  /**
   * Crea una nueva instancia de Submission (estado inicial: 'pending').
   */
  static create(actorId: string, roundId: string, videoUrl: VideoUrl, id?: string, videoKey?: string): Submission {
    const finalId = id || genUUID('sub');
    return new Submission(finalId, actorId, roundId, videoUrl, videoKey ?? null);
  }

  /**
   * Constructor privado. Usar `Submission.create()` para instanciar.
   */
  private constructor(
    id: string,
    actorId: string,
    roundId: string,
    videoUrl: VideoUrl,
    videoKey: string | null = null,
    duration: number | null = null,
    status: SubmissionStatus = 'pending',
    score: Score = Score.none(),
    feedback: Feedback = Feedback.none()
  ) {
    this._id = id;
    this._actorId = actorId;
    this._roundId = roundId;
    this._videoUrl = videoUrl;
    this._videoKey = videoKey;
    this._duration = duration;
    this._status = status;
    this._score = score;
    this._feedback = feedback;
  }

  /**
   * Actualiza el review de una submission (permite re-evaluación).
   * - pending → reviewed
   * - reviewed → reviewed (se mantiene)
   * - selected / rejected → error (estados finales)
   */
  updateReview(score: Score, feedback: Feedback): Submission {
    if (this._status === 'selected' || this._status === 'rejected') {
      throw new Error('Cannot review a submission that has been selected or rejected');
    }
    return new Submission(
      this._id,
      this._actorId,
      this._roundId,
      this._videoUrl,
      this._videoKey,
      this._duration,
      'reviewed',
      score,
      feedback
    );
  }

  /**
   * Revisa la submission (solo si está en estado 'pending').
   */
  review(score: Score, feedback: Feedback): Submission {
    if (this._status !== 'pending') {
      throw new Error('Only pending submissions can be reviewed');
    }
    return new Submission(
      this._id,
      this._actorId,
      this._roundId,
      this._videoUrl,
      this._videoKey,
      this._duration,
      'reviewed',
      score,
      feedback
    );
  }

  /**
   * Selecciona la submission (solo si está en estado 'reviewed').
   */
  select(): Submission {
    if (this._status !== 'reviewed') {
      throw new Error('Only reviewed submissions can be selected');
    }
    return new Submission(
      this._id,
      this._actorId,
      this._roundId,
      this._videoUrl,
      this._videoKey,
      this._duration,
      'selected',
      this._score,
      this._feedback
    );
  }

  /**
   * Rechaza la submission (no puede estar 'selected').
   */
  reject(): Submission {
    if (this._status === 'selected') {
      throw new Error('Selected submissions cannot be rejected');
    }
    return new Submission(
      this._id,
      this._actorId,
      this._roundId,
      this._videoUrl,
      this._videoKey,
      this._duration,
      'rejected',
      this._score,
      this._feedback
    );
  }

  // ============================================
  // Getters
  // ============================================
  get id(): string {
    return this._id;
  }

  get actorId(): string {
    return this._actorId;
  }

  get roundId(): string {
    return this._roundId;
  }

  get videoUrl(): VideoUrl {
    return this._videoUrl;
  }

  get videoKey(): string | null {
    return this._videoKey;
  }

  get duration(): number | null {
    return this._duration;
  }

  get status(): SubmissionStatus {
    return this._status;
  }

  get score(): Score {
    return this._score;
  }

  get feedback(): Feedback {
    return this._feedback;
  }

  /**
   * Actualiza la duración del video.
   * Solo disponible para archivos locales subidos.
   * Para URLs externas (YouTube, Vimeo, ...) no se registra.
   */
  withDuration(duration: number): Submission {
    return new Submission(
      this._id,
      this._actorId,
      this._roundId,
      this._videoUrl,
      this._videoKey,
      duration,
      this._status,
      this._score,
      this._feedback
    );
  }
}
