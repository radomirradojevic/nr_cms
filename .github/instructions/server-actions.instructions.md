---
description: Outlines the rules and conventions for writing Server Actions in this project. Read this whenever creating or modifying server actions.
---

# Server Actions

> All data mutations (create, update, delete) MUST be performed via Server Actions. Direct database access or mutations from Client Components is not allowed.

## File Conventions

- Server Action files MUST be named `actions.ts`.
- Each `actions.ts` file MUST be colocated in the same directory as the Client Component that calls it.
- Server Actions MUST include the `'use server'` directive at the top of the file.

## Calling Server Actions

- Server Actions MUST be called from Client Components (files with `'use client'`).
- Never call Server Actions from Server Components — fetch data via `/data` helpers instead.

## TypeScript Types

- ALL data passed into a Server Action MUST be typed with explicit TypeScript types or interfaces.
- **Never use `FormData` as a parameter type.** Define a typed object instead.

```ts
// ✅ Correct
type CreateLinkInput = {
  url: string;
  slug: string;
};

export async function createLink(input: CreateLinkInput) { ... }

// ❌ Wrong
export async function createLink(formData: FormData) { ... }
```

## Validation

- ALL inputs MUST be validated with [Zod](https://zod.dev) before any database operation.
- Define the Zod schema at the top of the file alongside the action.

```ts
const createLinkSchema = z.object({
  url: z.string().url(),
  slug: z.string().min(1).max(50),
});

export async function createLink(input: CreateLinkInput) {
  const parsed = createLinkSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  ...
}
```

## Authentication

- Every Server Action MUST call `auth()` from `@clerk/nextjs/server` as the **first** operation.
- If the user is not authenticated, return an error object — do **not** throw.

```ts
import { auth } from "@clerk/nextjs/server";

export async function createLink(input: CreateLinkInput) {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized." };
  ...
}
```

## Database Operations

- Server Actions MUST NOT use Drizzle queries directly.
- ALL database access must go through helper functions located in the `/data` directory.

```ts
// ✅ Correct
import { insertLink } from "@/data/links";

export async function createLink(input: CreateLinkInput) {
  ...
  await insertLink(parsed.data);
}

// ❌ Wrong — do not use drizzle directly in actions.ts
import { db } from "@/db";
export async function createLink(input: CreateLinkInput) {
  await db.insert(links).values(input);
}
```

## Return Values

- Server Actions MUST NOT throw errors under any circumstances — catch all exceptions internally.
- Always return a plain object with either a `success` or `error` property.

```ts
// ✅ Correct
export async function createLink(input: CreateLinkInput) {
  try {
    ...
    return { success: true };
  } catch {
    return { error: "Something went wrong." };
  }
}

// ❌ Wrong
export async function createLink(input: CreateLinkInput) {
  throw new Error("Something went wrong.");
}
```
