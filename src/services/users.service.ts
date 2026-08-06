import { AppError } from '../middleware/errorHandler';
import { UsersRepository } from '../repositories/users.repository';
import type { UpdateProfileDto } from '../types/users.types';
import type { UserProfile } from '@prisma/client';

export class UsersService {
  private readonly usersRepo = new UsersRepository();

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.usersRepo.findByUserId(userId);
    if (!profile) throw new AppError(404, 'Profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const profile = await this.usersRepo.findByUserId(userId);
    if (!profile) throw new AppError(404, 'Profile not found');
    return this.usersRepo.update(userId, dto);
  }

  async createProfileFromEvent(userId: string): Promise<UserProfile> {
    const existing = await this.usersRepo.findByUserId(userId);
    if (existing) return existing;
    return this.usersRepo.create({ userId });
  }
}
