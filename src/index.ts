import express from 'express';
import pinoHttp from 'pino-http';
import { config } from './config/index';
import { logger } from './config/logger';
import { usersRouter } from './routes/users.routes';
import { errorHandler } from './middleware/errorHandler';
import { startConsumers } from './events/consumers/auth.consumer';

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use('/health', (_req, res) => res.json({ status: 'ok', service: 'users-service' }));
app.use('/', usersRouter);
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`users-service REST listening on port ${config.PORT}`);
});

startConsumers().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start Kafka consumers');
  process.exit(1);
});
