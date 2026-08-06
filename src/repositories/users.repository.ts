import { PrismaClient, UserProfile } from '@prisma/client';
import type { UpdateProfileDto } from '../types/users.types';

const prisma = new PrismaClient();

export class UsersRepository {
  findByUserId(userId: string): Promise<UserProfile | null> {
    return prisma.userProfile.findUnique({ where: { userId } });
  }

  create(data: { userId: string }): Promise<UserProfile> {
    return prisma.userProfile.create({ data });
  }

  update(userId: string, data: UpdateProfileDto): Promise<UserProfile> {
    return prisma.userProfile.update({ where: { userId }, data });
  }
}
