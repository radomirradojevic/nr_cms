import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

const enabled = process.env.NODE_ENV === "test" && Boolean(process.env.DATABASE_URL);

test("fulfillment operation claim is safe for 10 workers and stale lease tokens cannot overwrite completion", { skip: !enabled }, async () => {
  const { Client } = await import("pg");
  const table = `fulfillment_claim_${crypto.randomUUID().replaceAll("-", "")}`;
  const connectionString = process.env.DATABASE_URL;
  const admin = new Client({ connectionString });
  await admin.connect();
  try {
    await admin.query(`create table ${table} (id uuid primary key, status text not null, lease_token uuid, lease_expires_at timestamptz, attempt_count integer not null default 0)`);
    const id = crypto.randomUUID();
    await admin.query(`insert into ${table} (id, status) values ($1, 'pending')`, [id]);
    const workers = await Promise.all(Array.from({ length: 10 }, async () => {
      const client = new Client({ connectionString });
      await client.connect();
      const token = crypto.randomUUID();
      try {
        await client.query("begin");
        const result = await client.query(`
          with candidate as (
            select id from ${table}
            where status in ('pending','retry') and (lease_expires_at is null or lease_expires_at <= now())
            for update skip locked limit 1
          )
          update ${table} op
          set status = 'processing', lease_token = $1, lease_expires_at = now() + interval '60 seconds', attempt_count = attempt_count + 1
          from candidate where op.id = candidate.id
          returning op.id`, [token]);
        await client.query("commit");
        return { claimed: result.rowCount === 1, token };
      } finally { await client.end(); }
    }));
    const winner = workers.filter((worker) => worker.claimed);
    assert.equal(winner.length, 1);
    const winningToken = winner[0].token;
    const success = await admin.query(`update ${table} set status = 'succeeded' where id = $1 and status = 'processing' and lease_token = $2`, [id, winningToken]);
    assert.equal(success.rowCount, 1);
    const stale = await admin.query(`update ${table} set status = 'retry' where id = $1 and status = 'processing' and lease_token = $2`, [id, crypto.randomUUID()]);
    assert.equal(stale.rowCount, 0);

    const secondId = crypto.randomUUID();
    await admin.query(`insert into ${table} (id, status, lease_token, lease_expires_at) values ($1, 'processing', $2, now() - interval '1 second')`, [secondId, crypto.randomUUID()]);
    const recovered = await admin.query(`update ${table} set status = 'retry', lease_token = null where id = $1 and status = 'processing' and lease_expires_at <= now()`, [secondId]);
    assert.equal(recovered.rowCount, 1);
  } finally {
    await admin.query(`drop table if exists ${table}`);
    await admin.end();
  }
});
