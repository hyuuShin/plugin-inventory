import test from "node:test";
import assert from "node:assert/strict";
import { workflowPolicy } from "../scripts/workflow-policy.mjs";
import {
  persistCollected,
  recordDeployment,
} from "../scripts/persist-data.mjs";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeStoredData, readStoredData } from "../collector/run.mjs";
import {
  fixtureConfig,
  fixtureStored,
  fixtureIssue,
  NOW,
} from "./helpers/fixtures.mjs";
const config = fixtureConfig();
test("write authorization is denied for external PRs and another authors Issue", () => {
  assert.equal(
    workflowPolicy({
      config,
      eventName: "pull_request",
      actor: "hyuuShin",
      event: {},
    }).allowed,
    false,
  );
  assert.equal(
    workflowPolicy({
      config,
      eventName: "issues",
      actor: "other",
      event: {
        action: "opened",
        issue: fixtureIssue({ user: { login: "other" } }),
      },
    }).allowed,
    false,
  );
  assert.equal(
    workflowPolicy({
      config,
      eventName: "issues",
      actor: "hyuuShin",
      event: { action: "closed", issue: fixtureIssue() },
    }).allowed,
    true,
  );
});
test("event payload is interpreted only as data and schedules select the right mode", () => {
  assert.equal(
    workflowPolicy({
      config,
      eventName: "schedule",
      actor: "hyuuShin",
      event: { schedule: "43 0 * * 1" },
    }).mode,
    "weekly",
  );
  assert.equal(
    workflowPolicy({
      config,
      eventName: "workflow_dispatch",
      actor: "hyuuShin",
      event: { inputs: { mode: "$(touch /tmp/bad)", dry_run: "false" } },
    }).mode,
    "daily",
  );
  assert.equal(
    workflowPolicy({
      config,
      eventName: "workflow_dispatch",
      actor: "hyuuShin",
      event: { inputs: { mode: "weekly", dry_run: "true" } },
    }).dryRun,
    true,
  );
});
test("stale main prevents any data write and valid collection commits before publication", async () => {
  const root = await fs.mkdtemp(join(tmpdir(), "inventory-persist-"));
  try {
    const collected = join(root, "collected"),
      directory = join(root, "data");
    await writeStoredData({ directory: collected, data: fixtureStored() });
    const old = fixtureStored();
    old.current.run.lastAttemptAt = NOW;
    await writeStoredData({ directory, data: old });
    let committed = false;
    await assert.rejects(
      persistCollected({
        directory,
        collected,
        expectedHead: "old",
        remoteHead: "new",
        commit: async () => {
          committed = true;
        },
      }),
      /새 커밋/,
    );
    assert.equal(committed, false);
    assert.equal(
      (await readStoredData(directory)).current.run.lastAttemptAt,
      NOW,
    );
    await persistCollected({
      directory,
      collected,
      expectedHead: "same",
      remoteHead: "same",
      commit: async () => {
        committed = true;
        return "revision";
      },
    });
    assert.equal(committed, true);
    assert.equal(
      (await readStoredData(directory)).current.run.lastPublishedAt,
      null,
    );
    await recordDeployment({ directory, now: NOW, success: false });
    assert.equal(
      (await readStoredData(directory)).current.run.lastPublishedAt,
      null,
    );
    await recordDeployment({ directory, now: NOW, success: true });
    assert.equal(
      (await readStoredData(directory)).current.run.lastPublishedAt,
      NOW,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
