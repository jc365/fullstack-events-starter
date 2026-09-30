/**
 * @file auth.ts
 * @module infrastructure/middleware
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, AUTH_INVALID_TOKEN } from '../errors';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

const SERVICE_TOKENS = new Set(
  (process.env.ADMIT_TOKENS || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Unauthorized'));
    return;
  }

  const token = authHeader.split(' ')[1];

  if (SERVICE_TOKENS.has(token)) {
    req.user = { id: 'service', role: 'service' };
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    req.user = { id: decoded.userId };
    next();
  } catch {
    next(new UnauthorizedError('Invalid token', AUTH_INVALID_TOKEN));
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}
