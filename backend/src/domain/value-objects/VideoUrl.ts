/**
 * @file VideoUrl.ts
 * @module domain/value-objects
 *
 * Value Object que representa una URL de video.
 * Es inmutable y valida el formato en el momento de la creación.
 * Soporta detección de plataforma (YouTube, Vimeo) y extracción de ID.
 */

export type VideoPlatform = 'youtube' | 'vimeo' | 'local' | 'other';

export default class VideoUrl {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Crea una nueva instancia de VideoUrl.
   * @param value - URL del video.
   * @throws {Error} Si la URL no es válida.
   */
  static create(value: string): VideoUrl {
    if (!value || value.trim().length === 0) {
      throw new Error('Video URL cannot be empty');
    }
    if (!VideoUrl.isValid(value)) {
      throw new Error(`Invalid video URL: "${value}"`);
    }
    return new VideoUrl(value.trim());
  }

  /**
   * Devuelve la URL como string.
   */
  getValue(): string {
    return this._value;
  }

  /**
   * Detecta la plataforma del video.
   */
  platform(): VideoPlatform {
    if (this._value.startsWith('/uploads/')) {
      return 'local';
    }
    if (this._value.includes('youtube.com') || this._value.includes('youtu.be')) {
      return 'youtube';
    }
    if (this._value.includes('vimeo.com')) {
      return 'vimeo';
    }
    return 'other';
  }

  /**
   * Extrae el ID del video si es de una plataforma conocida.
   */
  videoId(): string | null {
    const platform = this.platform();

    if (platform === 'youtube') {
      const match = this._value.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      return match ? match[1] : null;
    }

    if (platform === 'vimeo') {
      const match = this._value.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : null;
    }

    return null;
  }

  /**
   * Compara este VideoUrl con otro por valor.
   */
  equals(other: VideoUrl): boolean {
    return this._value === other._value;
  }

  /**
   * Valida si un string representa una URL de video válida.
   * Acepta URLs HTTP(S) y rutas locales (/uploads/...).
   */
  static isValid(value: string): boolean {
    const trimmed = value.trim();
    // Local file paths (for uploaded videos)
    if (trimmed.startsWith('/uploads/')) return true;
    // HTTP(S) URLs
    const urlRegex = /^https?:\/\/.+\..+/i;
    return urlRegex.test(trimmed);
  }
}
