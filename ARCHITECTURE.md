# Architecture Summary

## Layers

- Controllers handle HTTP only.
- Services own business workflows.
- Repositories isolate Sequelize from the rest of the codebase.
- Clients isolate Microsoft Graph and token acquisition.
- Middleware handles auth, RBAC, correlation IDs, validation, and errors.

## Identity model

- Incoming API authentication is delegated to Microsoft Entra ID.
- The auth middleware validates the Entra access token and extracts `oid`, `tid`, `roles`, and `preferred_username`/email.
- The local `Users` table keys external identity by `entra_oid`, not email.

## Invitation flow

1. Admin calls `POST /admin/invitations`.
2. Service resolves the target app role ID from the API service principal.
3. Service checks Graph for an existing user by email.
4. If found, it writes `PendingActivation` and skips the Graph invite.
5. If not found, it sends the Graph invitation and writes `Invited`.
6. No app role assignment happens during invite.

## Activation flow

1. User signs in and calls `GET /me`.
2. Service upserts the local user from token claims.
3. Service resolves a pending invitation by `graph_user_id` or email.
4. If onboarding is pending, it assigns the Entra app role through Graph.
5. Local invitation and user state move to `Active`.

## Recovery flow

1. Admin calls `POST /admin/users/:entraObjectId/reset-redemption`.
2. Service delegates redemption reset to the Graph client.
3. Local user and invitation records move to `RedemptionResetRequired`.
4. Audit log records the action with a correlation ID.

## Persistence and transactions

- PostgreSQL is the primary database.
- Sequelize is used only inside the repository layer.
- Service methods use repository calls plus explicit Sequelize transactions for local state changes.
- Migrations are managed with Umzug.

## Cross-cutting concerns

- Correlation IDs are assigned per request and returned in the response header.
- Validation is centralized with Joi.
- RBAC is centralized through role-to-permission mapping, with a strict `Admin` role gate on admin endpoints.
- Graph behavior is isolated in `src/clients/GraphClient.js`, including role lookup, invitation, role assignment, and redemption reset.
