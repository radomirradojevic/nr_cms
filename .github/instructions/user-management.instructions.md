---
description: Outlines the rules and conventions for implementing CMS user management with ACL/RBAC via Clerk. Read this whenever working on /dashboard/users or any role-based access control logic.
---

# User Management — RBAC with Clerk

> User management is handled exclusively through the Clerk API. Do **not** store users or roles in the database. Roles are stored as an **array** in Clerk's `publicMetadata.roles` field.

## Roles

There are exactly **4 roles** in this system:

| Role        | Access                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| `viewer`    | Frontend only — **no** backend access. Default for all new sign-ups.      |
| `author`    | Can create and manage own content only. Cannot publish.                   |
| `publisher` | Can manage own content and content created by authors. Can publish.       |
| `admin`     | Full access to all backend features including user management & settings. |

## Role Storage Format

Roles are stored in Clerk's `publicMetadata.roles` as a **string array**. A user can hold multiple roles simultaneously.

```json
// New sign-up (default)
{ "roles": ["viewer"] }

// Admin user
{ "roles": ["viewer", "admin"] }

// Publisher user
{ "roles": ["viewer", "publisher"] }

// Author user
{ "roles": ["viewer", "author"] }
```

- **Default on sign-up**: every new Clerk account must have `publicMetadata: { roles: ["viewer"] }` set automatically via a Clerk webhook.
- **Role check helper**: a user "has" a role if their `roles` array includes that role string.
- Only users whose `roles` array includes `"admin"` may access `/dashboard/users`.

## Clerk Integration Rules

- Use `@clerk/nextjs/server` — `auth()` and `clerkClient()` — for all server-side Clerk operations.
- Use the **Clerk Backend API** (`clerkClient().users.getUserList()`, `clerkClient().users.getUser()`, `clerkClient().users.updateUser()`) to fetch and mutate user data.
- **Never** expose Clerk secret keys or admin operations to the client.
- Role reads come from `auth()` session claims: `sessionClaims?.publicMetadata?.roles as string[]`.

## Route Protection

- In `proxy.ts`, guard `/dashboard/users(.*)` — redirect users whose `roles` array does not include `"admin"` to `/dashboard`.
- In every Server Action under `/dashboard/users`, call `auth()` first and verify the caller has `"admin"` in their `roles` array before proceeding.

## File Structure

```
app/
  dashboard/
    users/
      page.tsx                ← Server Component — lists all Clerk users
      [userId]/
        page.tsx              ← Server Component — user detail view
        edit-user-dialog.tsx  ← Client Component — role assignment dialog
        actions.ts            ← Server Actions — updateUserRoles
  api/
    webhooks/
      clerk/
        route.ts              ← Route Handler — sets default viewer role on user.created
```

## `/dashboard/users` — Users Table Page

**`page.tsx`** (Server Component):

- Call `auth()` → check `roles` includes `"admin"`, redirect to `/dashboard` if not.
- Fetch users via `(await clerkClient()).users.getUserList()`.
- Pass data to a shadcn/ui `Table` with columns: **Username**, **Email**, **Status** (`active` / `banned`), **Roles** (badges for each role in the array).
- Each row links to `/dashboard/users/[userId]`.

## `/dashboard/users/[userId]` — User Detail & Edit Page

**`page.tsx`** (Server Component):

- `await params` to get `userId` (params are Promises in this Next.js version).
- Call `auth()` → verify caller has `"admin"` role, redirect if not.
- Fetch user via `(await clerkClient()).users.getUser(userId)`.
- Display read-only fields: username, email, creation date, status.
- Render `<EditUserDialog>` pre-populated with the user's current `roles` array.

**`edit-user-dialog.tsx`** (`'use client'`):

- Uses shadcn/ui `Dialog` + a multi-select or grouped `Checkbox` list for role assignment.
- Available options: `viewer`, `author`, `publisher`, `admin`.
- `viewer` should always remain checked (it is the base role and cannot be removed).
- Calls `updateUserRoles` Server Action on submit.
- Shows success/error feedback via shadcn/ui toast or `Alert`.

**`actions.ts`** (`'use server'`):

```ts
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const updateUserRolesSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.enum(["viewer", "author", "publisher", "admin"])).min(1),
});

type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;

export async function updateUserRoles(input: UpdateUserRolesInput) {
  const { userId: callerId, sessionClaims } = await auth();
  if (!callerId) return { error: "Unauthorized." };

  const callerRoles = (sessionClaims?.publicMetadata?.roles ?? []) as string[];
  if (!callerRoles.includes("admin")) return { error: "Forbidden." };

  const parsed = updateUserRolesSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  // Ensure viewer is always present
  const roles = Array.from(new Set(["viewer", ...parsed.data.roles]));

  await (
    await clerkClient()
  ).users.updateUser(parsed.data.userId, {
    publicMetadata: { roles },
  });

  return { success: true };
}
```

## Default Role on Sign-Up — Clerk Webhook

**`app/api/webhooks/clerk/route.ts`** (Route Handler):

- Listen for the `user.created` Clerk webhook event.
- On receipt, call Clerk Backend API to set `publicMetadata: { roles: ["viewer"] }` on the new user.
- Verify the webhook signature using `svix` and `CLERK_WEBHOOK_SECRET` before processing any payload.
- Add `CLERK_WEBHOOK_SECRET` to `.env`.
- Install `svix`: `npm install svix`.

## Role Guard Helper (shared utility)

Create `lib/roles.ts` with a reusable helper to avoid repetition:

```ts
export function hasRole(roles: unknown, role: string): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.includes(role);
}
```

Use it in Server Components and Server Actions:

```ts
import { hasRole } from "@/lib/roles";

const roles = sessionClaims?.publicMetadata?.roles;
if (!hasRole(roles, "admin")) return { error: "Forbidden." };
```

## UI Rules

- All UI must use shadcn/ui — `Table`, `Dialog`, `Checkbox`, `Badge`, `Button`.
- Use `Badge` to display each role with a distinct color variant.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- No CSS modules or inline styles.

## Implementation TODO

- [ ] Add `/dashboard/users` route guard in `proxy.ts` (admin role required)
- [ ] Create `app/dashboard/users/page.tsx` — fetch and display Clerk user list
- [ ] Create `app/dashboard/users/[userId]/page.tsx` — display user detail
- [ ] Create `app/dashboard/users/[userId]/edit-user-dialog.tsx` — role edit dialog
- [ ] Create `app/dashboard/users/[userId]/actions.ts` — `updateUserRoles` Server Action
- [ ] Create `app/api/webhooks/clerk/route.ts` — assign `["viewer"]` on `user.created`
- [ ] Create `lib/roles.ts` — `hasRole()` utility
- [ ] Add `CLERK_WEBHOOK_SECRET` to `.env`
- [ ] Install `svix` (`npm install svix`)
