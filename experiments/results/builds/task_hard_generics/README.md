# Type-Safe Repository Client

A lightweight, generic TypeScript library for interacting with RESTful APIs. It provides a type-safe interface for CRUD operations with built-in support for headers, error mapping, and entity constraints.

## Installation

```bash
npm install @your-scope/repository-client
```

## Quick Start

```typescript
import { Repository, BaseEntity } from '@your-scope/repository-client';

interface User extends BaseEntity {
  name: string;
  email: string;
}

const repo = new Repository<User>('/users', {
  baseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' }
});

// Usage
const users = await repo.findAll({ limit: 10 });
const user = await repo.findById('123');
const newUser = await repo.create({ name: 'Alice', email: 'alice@example.com' });
await repo.update('123', { name: 'Alice Smith' });
await repo.remove('123');
```

## API Reference

| Method | Signature | Description |
| :--- | :--- | :--- |
| `findAll` | `(filter?: QueryFilter<T>) => Promise<T[]>` | Fetches a list of entities. |
| `findById` | `(id: string) => Promise<T>` | Fetches a single entity by ID. |
| `create` | `(data: CreatePayload<T>) => Promise<T>` | Creates a new entity. |
| `update` | `(id: string, data: UpdatePayload<T>) => Promise<T>` | Updates an existing entity. |
| `remove` | `(id: string) => Promise<void>` | Deletes an entity by ID. |

## Error Handling

The library maps HTTP errors to a custom `DomainError` class.

```typescript
import { DomainError } from '@your-scope/repository-client';

try {
  await repo.findById('invalid-id');
} catch (err) {
  if (err instanceof DomainError) {
    console.error(`Error ${err.code}: ${err.message}`);
  }
}