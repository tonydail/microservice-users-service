import { Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { UpdateProfileSchema } from '../types/users.types';
import { AuthenticatedRequest } from '../middleware/authGuard';
import { AppError } from '../middleware/errorHandler';

export class UsersController {
  private readonly usersService = new UsersService();

  getProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userId) return next(new AppError(401, 'Unauthorized'));
      const profile = await this.usersService.getProfile(req.userId);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userId) return next(new AppError(401, 'Unauthorized'));
      const dto = UpdateProfileSchema.parse(req.body);
      const profile = await this.usersService.updateProfile(req.userId, dto);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };
}
