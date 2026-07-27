# Backend Architecture

The backend is a modular monolith. Each bounded context owns its controllers, application
services, domain model, repository ports, and infrastructure adapters.

## Dependency direction

```text
Nitro route
  -> Controller
    -> Application Service
      -> Domain Aggregate
      -> Repository Port
        <- Infrastructure Adapter
```

- Domain code must not import Nitro, Drizzle, Supabase, or Vue.
- Controllers own HTTP parsing, authentication extraction, and response mapping.
- Application services coordinate use cases and transaction boundaries.
- Aggregates enforce state transitions and business authorization rules.
- Repository interfaces are inward-facing ports; Drizzle classes implement those ports.
- `server/bootstrap/backend-context.ts` is the composition root for constructor injection.
- Repositories created inside `WorkExecutionUnitOfWork` share one database transaction.

## Shared API contracts

Request and response contracts live under `shared/api`. Both the Vue application and Nitro
controllers import these contracts through `#shared`.

Shared contracts may contain:

- Zod request and response schemas
- Public request and response types
- Stable API error codes

Shared contracts must not contain:

- Domain aggregates or domain events
- Drizzle row types
- Repository interfaces
- Supabase or Nitro runtime objects

The persistence row, domain aggregate, application result, and public API response remain
separate models connected by explicit mappers.

## Work Execution

`server/modules/work-execution` is the first migrated bounded context. It owns:

- start work item
- complete work item
- cancel an incorrect start
- restore a completed work item
- void a work item
- report a work item issue and enqueue its Telegram notification

Every mutation uses optimistic concurrency through the `work_items.version` column. Work item
updates, status audit events, and notification outbox writes are committed in the same Drizzle
transaction.
