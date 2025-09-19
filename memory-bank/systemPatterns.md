# System Patterns

## Architecture Overview
Golden Palace follows a modern monorepo architecture with clear separation of concerns:

```
├── apps/api          # Express.js backend with Socket.IO
├── apps/web          # Next.js 15 frontend (to be implemented)
├── packages/database # Prisma schema and client
├── packages/shared   # Types, validations, utilities
├── packages/ui       # Shared React components
└── packages/config   # Shared tooling configurations
```

**Backend**: Layered architecture with repositories, services, controllers, and middleware
**Frontend**: Component-based React with server-side rendering and static generation
**Real-time**: Socket.IO for bidirectional communication between client and server

## Design Patterns

### **Repository Pattern**
- **Usage**: All database operations abstracted through repository classes
- **Benefits**: Testable data access, consistent API, easy to mock
- **Implementation**:
  - `UserRepository` for user management
  - `GroupRepository` for chat groups
  - `MessageRepository` for messaging

### **Service Layer Pattern**
- **Usage**: Business logic encapsulated in service classes
- **Benefits**: Reusable logic, separation of concerns, easier testing
- **Implementation**:
  - `AuthService` for authentication logic
  - `MessageService` for chat business rules
  - `GroupService` for group management

### **Middleware Chain Pattern**
- **Usage**: Request processing pipeline with authentication, validation, rate limiting
- **Benefits**: Modular request handling, security enforcement
- **Implementation**: Express middleware for auth, CORS, rate limiting, validation

### **Event-Driven Pattern**
- **Usage**: Socket.IO events for real-time features
- **Benefits**: Decoupled real-time communication, scalable architecture
- **Implementation**: WebSocket handlers for chat, typing indicators, reactions

## Component Structure
```
apps/api/src/
├── controllers/      # HTTP request handlers
├── middleware/       # Authentication, validation, security
├── repositories/     # Data access layer (Prisma)
├── services/         # Business logic layer
├── routes/           # API route definitions
├── websocket/        # Socket.IO event handlers
├── types/            # TypeScript type definitions
└── utils/            # Helper functions

packages/shared/src/
├── types/            # Shared TypeScript types
├── schemas/          # Zod validation schemas
├── constants/        # Application constants
└── utils/            # Shared utility functions
```

## Key Technical Decisions

### **TypeScript First**
- **Decision**: All code written in TypeScript with strict mode
- **Rationale**: Type safety prevents runtime errors, better developer experience

### **Test-Driven Development**
- **Decision**: All features implemented using red-green-refactor TDD
- **Rationale**: Higher code quality, better design, comprehensive test coverage

### **Monorepo Architecture**
- **Decision**: Single repository with multiple packages
- **Rationale**: Shared types, coordinated builds, easier dependency management

### **PostgreSQL + Prisma**
- **Decision**: PostgreSQL for data persistence with Prisma ORM
- **Rationale**: ACID compliance for financial data, type-safe database access

### **JWT Authentication**
- **Decision**: JWT access tokens with refresh token rotation
- **Rationale**: Stateless authentication, scalable, secure token management

## Data Flow

### **Authentication Flow**
1. User submits credentials to `/api/auth/login`
2. `AuthService` validates credentials via `UserRepository`
3. `TokenService` generates JWT access and refresh tokens
4. Tokens returned to client for subsequent requests
5. `AuthMiddleware` validates JWT on protected routes

### **Real-time Chat Flow**
1. Client connects to Socket.IO server with JWT authentication
2. `ChatHandler` authenticates WebSocket connection
3. Client joins group rooms for targeted message delivery
4. Messages sent via Socket.IO events trigger database saves
5. Messages broadcast to all group members in real-time

### **API Request Flow**
1. HTTP request hits Express server
2. Security middleware (helmet, CORS, rate limiting)
3. Authentication middleware validates JWT
4. Route-specific validation middleware
5. Controller delegates to service layer
6. Service layer uses repositories for data access
7. Response sent back through middleware chain

## Critical Paths

### **User Authentication**
- Registration, login, token refresh must always work
- Password hashing and validation critical for security
- Rate limiting prevents brute force attacks

### **Real-time Messaging**
- Socket.IO connection and authentication
- Message delivery and persistence
- Group membership validation

### **Data Integrity**
- Database transactions for consistency
- Input validation prevents malformed data
- Type safety throughout the application stack

### **Security**
- JWT token validation on all protected routes
- SQL injection prevention through Prisma
- XSS protection with input sanitization
- CORS configuration for cross-origin requests