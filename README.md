# Entra Login API

Backend-only Web API for Microsoft Entra ID guest invitation, first-login activation, and app-role onboarding.

## What it does

- Validates Entra bearer tokens for the API.
- Restricts admin endpoints to callers with the `Admin` app role.
- Invites external users as Entra guests through Microsoft Graph.
- Prevents duplicate invites when the guest already exists or a pending onboarding record already exists.
- Defers app role assignment until the guest's first successful login.
- Uses the Entra `oid` claim as the stable external identity key.
- Supports admin-triggered guest redemption reset through Graph.
- Stores app-specific onboarding data in PostgreSQL with repository boundaries.

## Stack

- Node.js with Express
- Sequelize with PostgreSQL (`pg`)
- Microsoft Graph REST APIs
- dotenv for configuration
- Jest + Supertest for tests
- Umzug for SQL migrations

## Project layout

```text
src/
  app.js
  server.js
  clients/
  config/
  constants/
  controllers/
  database/
  middleware/
  repositories/
  routes/
  services/
  utils/
  validators/
migrations/
tests/
```

## Environment

Copy `.env.example` to `.env` and set values for your tenant.

Required runtime settings:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`
- `ENTRA_TENANT_ID`
- `API_CLIENT_ID`
- `AUTH_AUDIENCE`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`
- `INVITE_REDIRECT_URL`

Useful optional settings:

- `PORT`
- `LOG_LEVEL`
- `LOG_SQL`
- `DB_SSL_REJECT_UNAUTHORIZED`
- `GRAPH_BASE_URL`
- `GRAPH_SCOPE`
- `SERVICE_PRINCIPAL_CACHE_TTL_MS`

Runtime notes:

- `DB_SSL=false` is the normal local Postgres setup.
- `DB_SSL=true` enables TLS for hosted Postgres.
- `DB_SSL_REJECT_UNAUTHORIZED=false` is only for self-signed or controlled environments.

Testing defaults to sqlite in-memory for speed, but integration tests can also run against a real Postgres database through `TEST_DB_*` variables.

## Graph permissions

This implementation relies on Graph application permissions for:

- Guest invitations
- Service principal lookup
- App role assignment

At minimum, the current code path expects:

- `User.Invite.All`
- `AppRoleAssignment.ReadWrite.All`
- `Application.Read.All`

Inference from Microsoft Graph docs and the `resetRedemption` flow: you will likely also need `User.ReadWrite.All` for redemption reset and related guest updates. Validate this in your tenant before production rollout.

Relevant Microsoft docs:

- App role assignment: <https://learn.microsoft.com/en-us/graph/api/user-post-approleassignments?view=graph-rest-1.0>
- Microsoft Graph permissions reference: <https://learn.microsoft.com/en-us/graph/permissions-reference>
- Access token guidance: <https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens>

## Install and run

```bash
npm install
npm run db:migrate
npm start
```

Development:

```bash
npm run dev
```

Tests:

```bash
npm test
```

Integration tests against Postgres:

```bash
npm run test:integration:postgres
```

That script expects `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_NAME`, `TEST_DB_USER`, and `TEST_DB_PASSWORD` to be set. The test helper auto-loads `.env.test` if present, and a sample file is available at `.env.test.example`.

## API endpoints

### `POST /admin/invitations`

Request:

```json
{
  "email": "user@example.com",
  "targetRole": "Reader"
}
```

Behavior:

- Requires bearer token with `Admin` app role.
- Validates the target app role against the API service principal in Entra.
- If the user already exists in Entra, no invite is sent and the onboarding record becomes `PendingActivation` or remains `Active`.
- If the user does not exist, Graph sends the invitation email and the onboarding record becomes `Invited`.
- No app role assignment happens here.

### `POST /admin/users/:entraObjectId/reset-redemption`

Behavior:

- Requires bearer token with `Admin` app role.
- Calls Graph `resetRedemption` flow through the invitation API.
- Marks local records as `RedemptionResetRequired`.
- Writes an audit log entry.

### `GET /me`

Behavior:

- Requires a valid bearer token.
- Upserts the local user by `oid`.
- Resolves onboarding by `graph_user_id` or normalized email.
- Assigns the target app role on first successful login only.
- Returns profile, roles, invitation snapshot, and onboarding status.

## Status model

- `Invited`
- `PendingActivation`
- `Active`
- `RedemptionResetRequired`
- `Disabled`

## Database

Migrations create:

- `Users`
- `Invitations`
- `AuditLogs`

The schema follows the requested relational structure, with indexes on:

- `Users.entra_oid` unique
- `Users.email`
- `Invitations.email`
- `Invitations.graph_user_id`

## Testing

Unit tests cover:

- invite new user
- existing user branch
- activation logic
- duplicate invite safety
- admin protection
- redemption reset
- Graph failure mapping

Integration tests cover:

- routes
- auth and admin middleware
- persistence
- invitation and activation transitions

An optional skipped scaffold is included under `tests/e2e/realTenant.scaffold.test.js`.

## Notes

- Entra remains the source of truth for identity and roles.
- Local data is for onboarding workflow and auditability only.
- Role IDs are never hardcoded; the Graph client resolves them from the service principal at runtime.
- `resetGuestRedemption` is intentionally isolated behind the Graph client because Microsoft Graph details and limitations can evolve.
