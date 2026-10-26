import test from "node:test";
import assert from "node:assert/strict";
import { syncRegistrations } from "../collector/registrations.mjs";
import { createGitHubClient } from "../collector/github.mjs";
import { collectTool } from "../collector/tools.mjs";
import {
  fixtureIssue,
  fixtureConfig,
  fixtureTarget,
  fixtureMetadata,
  NOW,
} from "./helpers/fixtures.mjs";
test("published registration strips URL query credentials even for invalid records", async () => {
  const raw =
    "https://github.com/example/tool?access_token=private-example#readme";
  const good = fixtureIssue({
    body: fixtureIssue().body.replace("https://github.com/example/tool", raw),
  });
  const rows = await syncRegistrations({
    issues: [
      good,
      fixtureIssue({
        number: 2,
        body: fixtureIssue().body.replace(
          "https://github.com/example/tool",
          "https://user:private-example@github.com/example/tool",
        ),
      }),
    ],
    config: fixtureConfig(),
    resolve: async () => fixtureTarget(),
  });
  assert.equal(JSON.stringify(rows).includes("private-example"), false);
  assert.equal(rows[1].validation.status, "invalid");
});
test("temporary target failure preserves duplicate exclusion", async () => {
  const issues = [fixtureIssue(), fixtureIssue({ number: 2 })],
    config = fixtureConfig();
  const previous = await syncRegistrations({
    issues,
    config,
    resolve: async () => fixtureTarget(),
  });
  const next = await syncRegistrations({
    issues,
    config,
    previous,
    resolve: async () => {
      throw Object.assign(Error("failed"), { code: "network" });
    },
  });
  assert.deepEqual(
    next.map((r) => r.validation.status),
    ["valid", "duplicate"],
  );
});
test("API conflict is distinguishable from an actually empty Git repository", async () => {
  for (const [message, code] of [
    ["Git Repository is empty.", "empty_repository"],
    ["Conflict in ref", "http_409"],
  ]) {
    const c = createGitHubClient({
      limits: { retries: 0 },
      fetchImpl: async () =>
        new Response(JSON.stringify({ message }), { status: 409 }),
    });
    await assert.rejects(c.get("/repos/a/b/commits"), (e) => e.code === code);
  }
});
test("new release after a failed check compares with last successful observation", async () => {
  const previous = {
    id: "1",
    target: fixtureTarget(),
    metadata: { status: "ok", value: {}, succeededAt: NOW },
    release: {
      status: "error",
      value: { id: 1 },
      succeededAt: "2026-10-20T00:00:00Z",
    },
    activity: {
      status: "error",
      value: { lastCommitSha: "old" },
      succeededAt: "2026-10-20T00:00:00Z",
    },
  };
  const c = {
    get: async (p) => ({
      data: p.endsWith("/commits")
        ? [{ sha: "new", commit: { committer: { date: NOW } } }]
        : fixtureMetadata(),
    }),
    paginate: async (p) => ({
      items: p.endsWith("/releases")
        ? [{ id: 2, tag_name: "v2", published_at: NOW }]
        : [],
      complete: true,
    }),
  };
  const t = await collectTool({
    registration: { id: "1", target: fixtureTarget() },
    previous,
    client: c,
    now: NOW,
  });
  assert.equal(t.changes.releaseChanged, true);
  assert.equal(t.changes.commitChanged, true);
});
