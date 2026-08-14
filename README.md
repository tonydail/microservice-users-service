# Users Service

> **Part of the microservices-ops authentication and user management system**

This service provides user profile management functionality for the microservices platform. It's designed to be **forked and customized** for your specific user management needs while maintaining production-ready patterns and best practices.

## 🎯 Purpose

The Users Service handles:
- **User Profile Management**: Create, read, update, and delete user profiles
- **Event-Driven Integration**: Automatically creates profiles when users register in the auth service
- **Profile Enrichment**: Extends basic auth data with additional user information
- **Profile Queries**: Retrieve user profiles for other services

## 🏗️ Architecture Overview

### Communication
- **REST API** (port 3002): External client profile management endpoints
- **gRPC Client**: Calls auth-service's `ValidateToken` RPC to validate tokens
- **Kafka Events**: 
  - Consumes: `auth.user.registered` (creates profile on registration)
  - Publishes: User profile events via transactional outbox

### Event-Driven Integration
The service participates in an event-driven flow:

1. **Consume Registration Events**: Listens to `auth.user.registered` from Kafka
2. **Create Profile**: Automatically creates user profile when registration event received
3. **Idempotent Processing**: Uses `event_id` to prevent duplicate profile creation
4. **Publish Profile Events**: Emits profile change events via transactional outbox

### Layered Architecture
Strict separation of concerns with **no layer skipping**:
```
routes/          → Express Router wiring (no logic)
controllers/     → Request parsing, Zod validation, error handling
services/        → Business logic, orchestration, transaction management
repositories/    → All Prisma queries (zero business logic)
events/
  producers/     → Kafka producer wrappers
  consumers/     → Kafka consumer handlers (idempotent)
  outbox/        → outbox.writer.ts (ONLY in prisma.$transaction)
grpc/
  client.ts      → gRPC client to call auth-service
  proto/         → Protocol Buffer definitions
```

## 🛠️ Tech Stack

### Core
- **Node.js** + **TypeScript**: Runtime and type safety
- **Express**: REST API framework
- **Prisma ORM**: Type-safe database access
- **PostgreSQL** (port 5434): Primary data store

### Communication
- **@grpc/grpc-js**: gRPC client for calling auth-service
- **KafkaJS**: Event consumption and publishing (via outbox)

### Development & Quality
- **Vitest**: Unit and integration testing
- **ESLint + Prettier**: Code quality and formatting
- **Zod**: Schema validation
- **Pino**: Structured logging
- **ts-node-dev**: Development hot reload

### Infrastructure
- **Docker + Dev Containers**: Isolated development environment
- **Debezium**: CDC for transactional outbox pattern

## 🔑 Key Patterns

### Transactional Outbox
The service **never** publishes to Kafka directly. All events are written within database transactions:

```typescript
await prisma.$transaction([
  prisma.userProfile.update({ where: { id }, data: profileData }),
  prisma.outboxEvent.create({
    data: {
      aggregateId: profileId,
      eventType: 'user.profile.updated',
      payload: { profileId, userId, updatedFields }
    }
  })
]);
```

Debezium watches the PostgreSQL WAL and publishes events to Kafka, ensuring exactly-once semantics.

### Idempotent Event Consumption
Kafka consumers check `event_id` before processing to prevent duplicate operations:

```typescript
const existingProfile = await prisma.userProfile.findUnique({
  where: { userId: event.payload.userId }
});

if (existingProfile) {
  logger.info(`Profile already exists for user ${event.payload.userId}`);
  return; // Skip duplicate
}

// Create profile...
```

### Configuration
Only `src/config/index.ts` reads `process.env` (Zod-validated at startup). Configuration is type-safe throughout the application.

### Error Handling
All errors flow through `AppError` class and centralized `errorHandler` middleware. No stack traces in production.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (if running outside container)
- VS Code (recommended for Dev Container support)
- **Auth service must be running** (for gRPC token validation)

### Development Setup (Dev Container)

1. **Ensure shared infrastructure is running**:
   ```bash
   # From microservices-ops root
   cd microservice-core-services
   ./start.sh
   ```

2. **Ensure auth service is running** (for gRPC calls):
   ```bash
   # Auth service should be started by start-services.sh
   # or opened in its own Dev Container
   ```

3. **Open in VS Code**:
   ```bash
   # From microservices-ops root
   code microservice-users-service
   ```

4. **Reopen in Container**:
   - Press `Cmd/Ctrl+Shift+P`
   - Select "Dev Containers: Reopen in Container"
   - Wait for container to build and start

5. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

The service will be available at:
- REST API: http://localhost:3002
- Postgres: localhost:5434

### Manual Setup (Without Dev Container)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📝 Available Commands

```bash
# Development
npm run dev                    # Start with hot reload (ts-node-dev)
npm run build                  # Compile TypeScript to dist/
npm run start                  # Run compiled JavaScript (production)

# Testing
npm run test                   # Run all tests (Vitest)
npm run test:unit             # Run unit tests only
npm run test:integration      # Run integration tests only
npm run test:watch            # Run tests in watch mode

# Code Quality
npm run lint                   # Lint with ESLint
npm run lint:fix              # Fix linting issues
npm run format                 # Format with Prettier

# Database
npm run db:migrate            # Run migrations (development)
npm run db:migrate:prod       # Run migrations (production)
npm run db:seed               # Seed database
npm run db:studio             # Open Prisma Studio
npm run db:generate           # Generate Prisma Client
```

## 📁 Project Structure

```
microservice-users-service/
├── src/
│   ├── routes/              # Express route definitions
│   ├── controllers/         # Request handlers with validation
│   ├── services/           # Business logic layer
│   ├── repositories/       # Database access layer (Prisma)
│   ├── events/
│   │   ├── producers/      # Kafka producer wrappers
│   │   ├── consumers/      # Kafka consumer handlers (auth.user.registered)
│   │   └── outbox/         # Transactional outbox writer
│   ├── grpc/
│   │   ├── client.ts       # gRPC client to call auth-service
│   │   └── proto/          # Protocol Buffer definitions
│   ├── middleware/         # Express middleware (auth, errors)
│   ├── config/            # Configuration (Zod-validated env)
│   ├── types/             # Zod schemas + TypeScript types
│   └── index.ts           # Application entry point
├── prisma/
│   ├── schema.prisma       # Database schema + OutboxEvent model
│   ├── migrations/         # Database migrations
│   └── seed.ts            # Database seeding script
├── tests/
│   ├── unit/              # Unit tests (mocked repositories)
│   └── integration/       # Integration tests (real database)
├── .devcontainer/         # Dev Container configuration
├── register-outbox-connector.sh  # Debezium connector registration
└── package.json
```

## 🔌 API Endpoints

### REST API (Port 3002)

```bash
GET    /users              # List all user profiles (paginated)
GET    /users/:id          # Get user profile by ID
POST   /users              # Create user profile (typically via event)
PUT    /users/:id          # Update user profile
DELETE /users/:id          # Delete user profile
```

All endpoints require valid JWT token in `Authorization: Bearer <token>` header (validated via auth-service gRPC).

## 🔄 Events

### Consumed Events

| Event Type | Topic | Action |
|------------|-------|--------|
| `user.registered` | `auth.user.registered` | Create user profile automatically |

### Published Events

| Event Type | Topic | Payload | Trigger |
|------------|-------|---------|---------|
| `user.profile.created` | `users.profile.created` | `{ profileId, userId, createdAt }` | Profile creation |
| `user.profile.updated` | `users.profile.updated` | `{ profileId, userId, updatedFields }` | Profile update |
| `user.profile.deleted` | `users.profile.deleted` | `{ profileId, userId, deletedAt }` | Profile deletion |

## 🧪 Testing

### Unit Tests
Mock all repositories using `vi.mock()`. No real database required.

```bash
npm run test:unit
```

### Integration Tests
Require PostgreSQL. Tests run against a real database.

```bash
npm run test:integration
```

### Test Structure
- `tests/unit/`: Isolated business logic tests
- `tests/integration/`: End-to-end API tests with real database

## 🔗 Service Dependencies

### Runtime Dependencies
- **Auth Service**: gRPC calls for token validation
- **Kafka**: Event consumption and publishing
- **PostgreSQL**: Profile data storage
- **Debezium**: CDC for transactional outbox

### Integration Flow
```
Client → nginx (validates JWT) → Users Service (port 3002)
                                       ↓
                                 gRPC call to Auth Service (port 50051)
                                       ↓
                                 Token validated → process request
```

## 🔗 Related Repositories

Part of the microservices-ops ecosystem:
- [microservices-ops](https://github.com/tonydail/microservices-ops) - Central orchestrator
- [microservice-auth-service](https://github.com/tonydail/microservice-auth-service) - Authentication & JWT tokens
- [microservice-core-services](https://github.com/tonydail/microservice-core-services) - Shared infrastructure

## 🐛 Issue Tracking

**Issues are tracked centrally** in the [microservices-ops repository](https://github.com/tonydail/microservices-ops/issues). This repository has issues disabled.

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch
3. Follow the layered architecture patterns
4. Write unit and integration tests
5. Ensure all tests pass: `npm test`
6. Run linting: `npm run lint:fix`
7. Submit a pull request
8. Track the PR in the central microservices-ops issue tracker

## 📄 License

[Your License Here]
