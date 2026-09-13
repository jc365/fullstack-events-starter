/**
 * @file videoUpload.ts
 * @module infrastructure/storage
 *
 * Configuración de multer para subida de videos.
 * Usa memoryStorage para permitir upload a R2 o disco local via StorageService.
 */

import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

const videoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default videoUpload;
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
