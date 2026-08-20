/**
 * Integration test — requires a running Postgres instance.
 * Run with: npm run test:integration
 * Ensure DATABASE_URL points to a test database before running.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { UsersService } from '../../src/services/users.service.js';

const prisma = new PrismaClient();
const usersService = new UsersService();
const userId = 'integration-user-id';

beforeAll(async () => {
  await prisma.$connect();
  await prisma.userProfile.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.userProfile.deleteMany({ where: { userId } });
  await prisma.$disconnect();
});

describe('UsersService integration', () => {
  it('creates a profile from a Kafka event (idempotent)', async () => {
    const first = await usersService.createProfileFromEvent(userId);
    const second = await usersService.createProfileFromEvent(userId);
    expect(first.userId).toBe(userId);
    expect(second.userId).toBe(userId);

    const count = await prisma.userProfile.count({ where: { userId } });
    expect(count).toBe(1);
  });
});
