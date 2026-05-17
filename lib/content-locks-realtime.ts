// Pluggable realtime adapter for content edit lock events.
//
// The lock system's correctness does NOT depend on realtime — heartbeats
// already detect lock loss within `LEASE_TTL_SECONDS` server-side. Realtime
// is purely a UX optimization that lets other viewers/admins see lock state
// transitions without polling.
//
// The default in-process adapter is a no-op (safe on Vercel serverless,
// where cross-instance broadcast is impossible without an external service).
// To enable cross-process delivery, swap `realtime` for a Pusher/Ably/etc
// implementation that satisfies this interface.

import type { LockEvent } from "@/lib/content-locks";
import { LOCK_CHANNEL } from "@/lib/content-locks";

export type LockRealtimeAdapter = {
  publish: (contentId: string, event: LockEvent) => Promise<void>;
};

const noopAdapter: LockRealtimeAdapter = {
  async publish(contentId, event) {
    // Intentionally a no-op. Subscribers should fall back to /status polling
    // and heartbeat responses for authoritative state.
    void contentId;
    void event;
  },
};

export const realtime: LockRealtimeAdapter = noopAdapter;

export { LOCK_CHANNEL };
