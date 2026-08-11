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

interface UserRegisteredEvent {
  eventId: string;
  userId: string;
  email: string;
}

export async function startConsumers(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: 'user.registered', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      // Debezium EventRouter sends the payload field directly as the message value
      const event = JSON.parse(message.value.toString()) as UserRegisteredEvent;
      logger.info({ event, userId: event.userId }, 'Received Kafka message');

      // Idempotency check — skip already-processed events
      if (PROCESSED_EVENT_IDS.has(event.eventId)) {
        logger.warn({ eventId: event.eventId }, 'Duplicate event skipped');
        return;
      }

      await usersService.createProfileFromEvent(event.userId);
      PROCESSED_EVENT_IDS.add(event.eventId);
      logger.info(
        { eventId: event.eventId, userId: event.userId },
        'User profile created from event',
      );
    },
  });
}
