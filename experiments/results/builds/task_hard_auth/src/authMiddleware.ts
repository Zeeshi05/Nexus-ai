import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken, extractBearerToken, TokenPayload } from './tokenService';
import { Role, Permission, hasPermission } from './roles';
import { sanitizeObject, containsSQLInjection } from './sanitizer';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.headers.authorization) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error: unknown) {
    const status = (error instanceof Error && 'status' in error) ? (error as any).status : 401;
    const message = error instanceof Error ? error.message : 'Unauthorized';
    res.status(status).json({ error: message });
  }
};

export const authorize = (permission: Permission): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};

export const sanitizeInputs: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const checkInjection = (obj: unknown): boolean => {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.values(obj).some((val) => {
      if (typeof val === 'string') return containsSQLInjection(val);
      if (typeof val === 'object' && val !== null) return checkInjection(val);
      return false;
    });
  };

  if (checkInjection(req.body) || checkInjection(req.query)) {
    res.status(400).json({ error: 'Bad Input: Potential SQL injection detected' });
    return;
  }

  if (typeof req.body === 'object' && req.body !== null) {
    req.body = sanitizeObject(req.body);
  }
  if (typeof req.query === 'object' && req.query !== null) {
    req.query = sanitizeObject(req.query as Record<string, unknown>);
  }
  next();
};