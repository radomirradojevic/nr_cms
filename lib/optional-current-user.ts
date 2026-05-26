import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

type CachedUserSnapshot = {
  expiresAt: number;
  publicMetadata: CurrentUser["publicMetadata"];
};

const USER_SNAPSHOT_TTL_MS = 15 * 60 * 1000;
const userSnapshots = new Map<string, CachedUserSnapshot>();

function describeOptionalAuthError(error: unknown) {
  if (!error || typeof error !== "object") {
    return "unknown error";
  }

  const maybeError = error as {
    clerkTraceId?: unknown;
    errors?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
  };

  const name = typeof maybeError.name === "string" ? maybeError.name : "Error";
  const status =
    typeof maybeError.status === "number" ? ` status=${maybeError.status}` : "";
  const traceId =
    typeof maybeError.clerkTraceId === "string"
      ? ` traceId=${maybeError.clerkTraceId}`
      : "";
  const message =
    typeof maybeError.message === "string" ? ` ${maybeError.message}` : "";

  return `${name}${status}${traceId}${message}`.trim();
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function publicMetadataFromClaims(claims: unknown): CurrentUser["publicMetadata"] {
  const record = objectValue(claims);
  if (!record) return {};

  const publicMetadata =
    objectValue(record.publicMetadata) ??
    objectValue(record.public_metadata) ??
    objectValue(record.metadata);
  if (publicMetadata) return publicMetadata;

  return Array.isArray(record.roles) ? { roles: record.roles } : {};
}

function rememberUserSnapshot(user: CurrentUser) {
  userSnapshots.set(user.id, {
    expiresAt: Date.now() + USER_SNAPSHOT_TTL_MS,
    publicMetadata: user.publicMetadata,
  });
}

function getCachedPublicMetadata(userId: string) {
  const snapshot = userSnapshots.get(userId);
  if (!snapshot) return null;

  if (snapshot.expiresAt <= Date.now()) {
    userSnapshots.delete(userId);
    return null;
  }

  return snapshot.publicMetadata;
}

function createFallbackUser(
  userId: string,
  publicMetadata: CurrentUser["publicMetadata"],
): CurrentUser {
  return {
    id: userId,
    publicMetadata,
    privateMetadata: {},
    unsafeMetadata: {},
    firstName: null,
    lastName: null,
    username: null,
    fullName: null,
    primaryEmailAddress: null,
    emailAddresses: [],
  } as unknown as CurrentUser;
}

export const getOptionalCurrentUser = cache(async function getOptionalCurrentUser(
  allowPendingSession = false,
) {
  // Public UI can opt into Clerk's short pending-session window; protected
  // routes and mutations keep Clerk's safer default.
  const session = allowPendingSession
    ? await auth({ treatPendingAsSignedOut: false })
    : await auth();
  const { userId, sessionClaims } = session;
  if (!userId) {
    return null;
  }

  try {
    const user = await currentUser();
    if (user) {
      rememberUserSnapshot(user);
      return user;
    }
  } catch (error) {
    unstable_rethrow(error);

    console.warn(
      `[auth] currentUser() failed (${describeOptionalAuthError(
        error,
      )}); using session fallback.`,
    );
  }

  try {
    const client = await clerkClient();
    const user = (await client.users.getUser(userId)) as CurrentUser;
    rememberUserSnapshot(user);
    return user;
  } catch (error) {
    unstable_rethrow(error);

    console.warn(
      `[auth] users.getUser() fallback failed (${describeOptionalAuthError(
        error,
      )}); using session fallback.`,
    );
  }

  const publicMetadata =
    getCachedPublicMetadata(userId) ??
    publicMetadataFromClaims(sessionClaims);
  return createFallbackUser(userId, publicMetadata);
});
