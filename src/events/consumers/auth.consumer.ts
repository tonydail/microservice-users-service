import { Kafka } from 'kafkajs';
import { config } from '../../config/index';
import { logger } from '../../config/logger';
import { UsersService } from '../../services/users.service';

const kafka = new Kafka({
  clientId: 'users-service-consumer',
  brokers: config.KAFKA_BROKERS.split(','),
});

const consumer = kafka.consumer({ groupId: 'users-service' });
const usersService = new UsersService();

const PROCESSED_EVENT_IDS = new Set<string>(); // In production, use Redis or DB deduplication

export async function startConsumers(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: 'auth.user.registered', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as {
        id: string;
        payload: { userId: string };
      };

      // Idempotency check — skip already-processed events
      if (PROCESSED_EVENT_IDS.has(event.id)) {
        logger.warn({ eventId: event.id }, 'Duplicate event skipped');
        return;
      }

      await usersService.createProfileFromEvent(event.payload.userId);
      PROCESSED_EVENT_IDS.add(event.id);
      logger.info(
        { eventId: event.id, userId: event.payload.userId },
        'User profile created from event',
      );
    },
  });
}
