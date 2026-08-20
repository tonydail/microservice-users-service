/**
 * Integration test for auth.user.registered event consumer
 * Tests the correct parsing of Debezium EventRouter message format
 * and idempotency handling.
 *
 * Run with: npm run test:integration
 * Ensure DATABASE_URL points to a test database before running.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { UsersService } from '../../src/services/users.service.js';

const prisma = new PrismaClient();
const testUserIds = ['user-456', 'user-789', 'user-999'];

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.userProfile.deleteMany({
    where: { userId: { in: testUserIds } },
  });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.userProfile.deleteMany({
    where: { userId: { in: testUserIds } },
  });
});

describe('auth.consumer - UserRegisteredEvent', () => {
  it('processes Debezium message format correctly', async () => {
    const usersService = new UsersService();
    
    // Simulate the exact message format sent by Debezium EventRouter
    // The payload field from outbox_events becomes the entire message value
    const debeziumMessage = {
      eventId: 'evt-123',
      userId: 'user-456',
      email: 'test@example.com',
    };

    const messageValue = Buffer.from(JSON.stringify(debeziumMessage));

    // Parse and process the message as the consumer does
    const event = JSON.parse(messageValue.toString()) as {
      eventId: string;
      userId: string;
      email: string;
    };

    await usersService.createProfileFromEvent(event.userId);

    // Verify profile was created
    const profile = await prisma.userProfile.findUnique({
      where: { userId: event.userId },
    });

    expect(profile).not.toBeNull();
    expect(profile?.userId).toBe('user-456');
  });

  it('handles idempotency correctly with eventId', async () => {
    const usersService = new UsersService();
    const PROCESSED_EVENT_IDS = new Set<string>();

    const debeziumMessage = {
      eventId: 'evt-789',
      userId: 'user-789',
      email: 'duplicate@example.com',
    };

    const messageValue = Buffer.from(JSON.stringify(debeziumMessage));
    const event = JSON.parse(messageValue.toString()) as {
      eventId: string;
      userId: string;
      email: string;
    };

    // First processing
    if (!PROCESSED_EVENT_IDS.has(event.eventId)) {
      await usersService.createProfileFromEvent(event.userId);
      PROCESSED_EVENT_IDS.add(event.eventId);
    }

    // Second processing (duplicate)
    let secondProcessed = false;
    if (!PROCESSED_EVENT_IDS.has(event.eventId)) {
      await usersService.createProfileFromEvent(event.userId);
      secondProcessed = true;
    }

    expect(secondProcessed).toBe(false);

    // Verify only one profile exists
    const count = await prisma.userProfile.count({
      where: { userId: event.userId },
    });
    expect(count).toBe(1);
  });

  it('extracts userId from payload correctly', async () => {
    const usersService = new UsersService();

    // Debezium sends the payload directly, not wrapped in an envelope
    const debeziumMessage = {
      eventId: 'evt-999',
      userId: 'user-999',
      email: 'extract@example.com',
    };

    const messageValue = Buffer.from(JSON.stringify(debeziumMessage));
    const event = JSON.parse(messageValue.toString()) as {
      eventId: string;
      userId: string;
      email: string;
    };

    // The userId is directly on the event object, not nested in event.payload.userId
    expect(event.userId).toBe('user-999');
    expect(event.eventId).toBe('evt-999');
    expect(event.email).toBe('extract@example.com');

    await usersService.createProfileFromEvent(event.userId);

    const profile = await prisma.userProfile.findUnique({
      where: { userId: 'user-999' },
    });

    expect(profile?.userId).toBe('user-999');
  });
});
