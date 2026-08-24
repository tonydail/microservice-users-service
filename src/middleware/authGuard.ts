import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { validateToken } from '../grpc/client';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRoles?: string[];
}

export function authGuard(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // Prefer X-User-Id from gateway (if nginx JWT validation is enabled)
  const gatewayUserId = req.headers['x-user-id'];
  if (typeof gatewayUserId === 'string') {
    req.userId = gatewayUserId;
  }

  const gatewayRoles = req.headers['x-user-roles'];
  if (typeof gatewayRoles === 'string') {
    req.userRoles = gatewayRoles.split(',');
  }

  if (req.userId && req.userRoles) {
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
      req.userRoles = []; // Initialize as empty array since roles are not provided by gRPC
      next();
    })
    .catch(() => {
      next(new AppError(401, 'Unauthorized'));
    });
}

export function roleGuard(requiredRole: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const roles = req.userRoles;
    if (Array.isArray(roles)) {
      if (roles.includes(requiredRole)) {
        return next();
      }
    }
    return next(new AppError(403, 'Forbidden'));
  };
}
