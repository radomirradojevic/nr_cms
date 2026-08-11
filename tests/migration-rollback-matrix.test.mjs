import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildCentralMigrationApplyPlan,
  buildMigrationMatrixPlan,
  canRollbackPackage,
  centralMigrationTagsFromJournal,
} from "../scripts/migration-matrix-harness.mjs";

const centralJournalPath = path.resolve(
  ".private/license-server/drizzle/meta/_journal.json",
);

test("versioned migration matrix covers every required fresh, upgrade, expand, failure and rollback case", () => {
  assert.deepEqual(buildMigrationMatrixPlan().map((item) => item.id), [
    "fresh",
    "upgrade_latest_production",
    "upgrade_minimum_supported",
    "rerun",
    "interrupted_backfill",
    "conflict_preflight",
    "checksum_mismatch",
    "failed_migration_atomic_recovery",
    "old_code_read_expand",
    "new_code_dual_write",
    "compatible_package_rollback",
    "incompatible_package_rollback",
  ]);
});

test("package rollback is allowed only for a declared compatible schema range", () => {
  assert.equal(canRollbackPackage({ currentSchemaVersion: 8, supportedSchemaRange: { max: 8, min: 6 } }), true);
  assert.equal(canRollbackPackage({ currentSchemaVersion: 9, supportedSchemaRange: { max: 8, min: 6 } }), false);
});

test("central migration rerun expects no pending migrations after fresh apply", () => {
  assert.deepEqual(buildCentralMigrationApplyPlan(["0000_initial", "0001_additive"]), [
    {
      expectedMigrations: "0000_initial,0001_additive",
      scenario: "fresh",
    },
    {
      expectedMigrations: "",
      scenario: "rerun",
    },
  ]);
});

test(
  "central migration matrix derives the complete expected list from the checked-in journal",
  {
    skip: !fs.existsSync(centralJournalPath),
  },
  () => {
    const journal = JSON.parse(fs.readFileSync(centralJournalPath, "utf8"));
    const tags = centralMigrationTagsFromJournal(journal);
    assert.equal(tags.length, journal.entries.length);
    assert.equal(tags.at(-1), "0016_activation_reenrollment_history");
    assert.equal(buildCentralMigrationApplyPlan(tags)[0].expectedMigrations, tags.join(","));
  },
);

test("central migration journal validation rejects gaps and duplicate tags", () => {
  assert.throws(
    () => centralMigrationTagsFromJournal({
      dialect: "postgresql",
      entries: [
        { idx: 0, tag: "0000_initial" },
        { idx: 2, tag: "0000_initial" },
      ],
      version: "7",
    }),
    /invalid central Drizzle journal entry/i,
  );
});
