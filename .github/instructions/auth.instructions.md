---
description: This file outlines the authentication requirements and implementation details for the project using Clerk. Read this to understand how auth works and what rules to follow.
---

# Authentication — Clerk

> Clerk is the **sole** authentication provider for this project. Do NOT introduce any other auth method, custom auth logic, or third-party auth library.

## Setup

- `@clerk/nextjs` is the only auth package — see `package.json`
- `ClerkProvider` wraps the entire app in `app/layout.tsx`
- Clerk env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) are set in `.env`
- Clerk middleware runs via `proxy.ts` using `clerkMiddleware()` from `@clerk/nextjs/server`

## Route Protection

### Protected Routes

- `/dashboard` — requires the user to be signed in. Unauthenticated users must be redirected to sign in.
- Protect this route in `proxy.ts` by configuring `clerkMiddleware` to require auth for `/dashboard(.*)`.

### Redirect Rules

- **Signed-in users visiting `/`** must be redirected to `/dashboard`.
- Implement this redirect in `proxy.ts` or in the homepage Server Component using `auth()`.

### Server Actions & Route Handlers

- Always call `auth()` from `@clerk/nextjs/server` at the top of every Server Action and API Route Handler.
- If the user is not authenticated, return an error object — do **not** throw.

## Sign In / Sign Up — Modal Only

- Sign in and sign up must **always** launch as Clerk modals. Never use dedicated `/sign-in` or `/sign-up` pages.
- Use `<SignInButton mode="modal">` and `<SignUpButton mode="modal">` from `@clerk/nextjs`.
- Do NOT create `app/sign-in/` or `app/sign-up/` route directories.

## Clerk Components Reference

| Component                     | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `<ClerkProvider>`             | Wraps the app in `layout.tsx`             |
| `<SignInButton mode="modal">` | Opens sign-in modal                       |
| `<SignUpButton mode="modal">` | Opens sign-up modal                       |
| `<UserButton />`              | Signed-in user avatar/menu                |
| `<Show when="signed-in">`     | Conditionally render for signed-in users  |
| `<Show when="signed-out">`    | Conditionally render for signed-out users |

## Implementation Plan

### TODO

- [ ] Update `proxy.ts` to protect `/dashboard` routes (require auth)
- [ ] Add redirect logic: signed-in users on `/` → `/dashboard`
- [ ] Ensure `<SignInButton>` and `<SignUpButton>` use `mode="modal"` in `app/layout.tsx`
- [ ] Create `app/dashboard/page.tsx` as a protected page (call `auth()` and verify user)
- [ ] Verify no `/sign-in` or `/sign-up` page routes exist in the project
- [ ] Confirm `auth()` is called in all Server Actions and Route Handlers
