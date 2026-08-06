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

beforeAll(async () => {
  await prisma.$connect();
  await prisma.outboxEvent.deleteMany();
  await prisma.userProfile.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('UsersService integration', () => {
  it('creates a profile from a Kafka event (idempotent)', async () => {
    const userId = 'integration-user-id';
    const first = await usersService.createProfileFromEvent(userId);
    const second = await usersService.createProfileFromEvent(userId);
    expect(first.userId).toBe(userId);
    expect(second.userId).toBe(userId);

    const count = await prisma.userProfile.count({ where: { userId } });
    expect(count).toBe(1);
  });
});
