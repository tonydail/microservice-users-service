import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { validateToken } from '../grpc/client';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authGuard(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // Prefer X-User-Id from gateway (if nginx JWT validation is enabled)
  const gatewayUserId = req.headers['x-user-id'];
  if (typeof gatewayUserId === 'string') {
    req.userId = gatewayUserId;
    return next();
  }

  // Fallback: extract Bearer token and validate via gRPC to auth-service
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized'));
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  validateToken(token)
    .then(({ valid, userId }) => {
      if (!valid) {
        return next(new AppError(401, 'Unauthorized'));
      }
      req.userId = userId;
      next();
    })
    .catch(() => {
      next(new AppError(401, 'Unauthorized'));
    });
}
