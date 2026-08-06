import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3002),
  GRPC_PORT: z.coerce.number().default(50052),
  DATABASE_URL: z.string().url(),
  KAFKA_BROKERS: z.string().default('localhost:29092'),
  AUTH_GRPC_HOST: z.string().default('localhost'),
  AUTH_GRPC_PORT: z.coerce.number().default(50051),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config: Env = parsed.data;
