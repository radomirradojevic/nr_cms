import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

test(
  "PostgreSQL payment inbox unique key and refund lock stay correct for 100 races",
  { skip: process.env.NODE_ENV !== "test" },
  async () => {
    assert.ok(databaseUrl, "DATABASE_URL must be injected by the test DB wrapper");
    const admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    const tableName = `nr_payment_v2_lock_${randomUUID().replaceAll("-", "")}`;
    const eventId = `test-${randomUUID()}`;
    try {
      const inserts = await Promise.all(
        Array.from({ length: 10 }, async () => {
          const client = new Client({ connectionString: databaseUrl });
          await client.connect();
          try {
            return await client.query(
              `INSERT INTO webshop_payment_events
                (provider_key, provider_event_id, event_type, raw_safe_metadata)
               VALUES ('stripe', $1, 'payment_captured', '{}'::jsonb)
               ON CONFLICT (provider_key, provider_event_id) DO NOTHING
               RETURNING id`,
              [eventId],
            );
          } finally {
            await client.end();
          }
        }),
      );
      assert.equal(inserts.filter((result) => result.rowCount === 1).length, 1);

      await admin.query(
        `CREATE TABLE ${tableName} (
          id integer PRIMARY KEY,
          captured_minor bigint NOT NULL,
          refunded_minor bigint NOT NULL DEFAULT 0
        )`,
      );
      await admin.query(
        `INSERT INTO ${tableName} (id, captured_minor, refunded_minor) VALUES (1, 100, 0)`,
      );

      for (let iteration = 0; iteration < 100; iteration += 1) {
        await admin.query(`UPDATE ${tableName} SET refunded_minor = 0 WHERE id = 1`);
        const attemptRefund = async () => {
          const client = new Client({ connectionString: databaseUrl });
          await client.connect();
          try {
            await client.query("BEGIN");
            const locked = await client.query(
              `SELECT captured_minor, refunded_minor FROM ${tableName} WHERE id = 1 FOR UPDATE`,
            );
            const row = locked.rows[0];
            if (Number(row.refunded_minor) + 60 > Number(row.captured_minor)) {
              await client.query("ROLLBACK");
              return false;
            }
            await client.query(
              `UPDATE ${tableName} SET refunded_minor = refunded_minor + 60 WHERE id = 1`,
            );
            await client.query("COMMIT");
            return true;
          } catch (error) {
            await client.query("ROLLBACK").catch(() => undefined);
            throw error;
          } finally {
            await client.end();
          }
        };
        const outcomes = await Promise.all([attemptRefund(), attemptRefund()]);
        const current = await admin.query(
          `SELECT refunded_minor FROM ${tableName} WHERE id = 1`,
        );
        assert.equal(outcomes.filter(Boolean).length, 1);
        assert.equal(Number(current.rows[0].refunded_minor), 60);
      }
    } finally {
      await admin.query(`DROP TABLE IF EXISTS ${tableName}`).catch(() => undefined);
      await admin.query(
        `DELETE FROM webshop_payment_events WHERE provider_key = 'stripe' AND provider_event_id = $1`,
        [eventId],
      );
      await admin.end();
    }
  },
);
