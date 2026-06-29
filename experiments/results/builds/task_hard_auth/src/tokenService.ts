import jwt from 'jsonwebtoken';
import { Role } from './roles';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not defined in environment variables. Using fallback for development only.');
}

const SECRET = JWT_SECRET || 'dev-fallback-secret-key';

export interface TokenPayload {
  userId: string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: string = '1h'): string {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const err = new Error('Token expired');
      (err as any).status = 498;
      throw err;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      const err = new Error('Invalid token');
      (err as any).status = 401;
      throw err;
    }
    throw error;
  }
}

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Malformed or missing authorization header');
    (err as any).status = 401;
    throw err;
  }
  return authHeader.split(' ')[1];
}