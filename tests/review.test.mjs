import test from "node:test";
import assert from "node:assert/strict";
import { collectAll } from "../collector/run.mjs";
import { collectTool } from "../collector/tools.mjs";
import {
  fixtureConfig,
  fixtureStored,
  fixtureMetadata,
  fixtureTarget,
  NOW,
} from "./helpers/fixtures.mjs";
const candidate = (id = 1) => ({
  repositoryId: id,
  fullName: "example/tool-" + id,
  url: "https://github.com/example/tool-" + id,
  description: "Prior verified candidate",
  topics: [],
  stars: 100,
  pushedAt: "2026-10-19T00:00:00Z",
  archived: false,
  fork: false,
  discoveredAt: "2026-10-19T00:00:00Z",
  lastSuccessfulAt: "2026-10-19T00:00:00Z",
});
function previousData() {
  const prior = fixtureStored();
  prior.candidates = [candidate()];
  prior.current.weekly = {
    weekId: "2026-10-19",
    publishedAt: "2026-10-19T00:00:00Z",
    status: "ok",
    growth: [],
    newcomers: [{ ...candidate(), delta: null }],
    coverage: { searchComplete: true },
  };
  prior.weeks = [prior.current.weekly];
  prior.current.run.lastSuccessfulAt = "2026-10-19T00:00:00Z";
  return prior;
}
test("review: Issue-list success cannot replace a report when all discovery evidence fails", async () => {
  const previous = previousData(),
    fail = () => {
      throw Object.assign(Error("failure"), { code: "network" });
    };
  const client = {
    paginate: async (p) =>
      p.endsWith("/issues") ? { items: [], complete: true } : fail(),
    get: fail,
  };
  const next = await collectAll({
    config: fixtureConfig({ discoveryQueries: ["query"] }),
    previous,
    client,
    now: NOW,
    weekly: true,
  });
  assert.deepEqual(next.current.weekly, previous.current.weekly);
  assert.equal(
    next.current.run.lastSuccessfulAt,
    previous.current.run.lastSuccessfulAt,
  );
  assert.equal(next.current.run.status, "partial");
});
test("review: incomplete prerelease or older release pages preserve verified stable release and date", async () => {
  const previous = {
    id: "1",
    target: fixtureTarget(),
    metadata: { status: "ok", value: {}, succeededAt: NOW },
    release: {
      status: "ok",
      value: { id: 10, tag: "v1", publishedAt: "2026-10-20T00:00:00Z" },
      succeededAt: "2026-10-21T00:00:00Z",
    },
    activity: {
      status: "ok",
      value: { lastCommitSha: null },
      succeededAt: NOW,
    },
  };
  for (const releases of [
    [{ id: 20, prerelease: true, published_at: NOW }],
    [{ id: 2, tag_name: "v0", published_at: "2026-10-01T00:00:00Z" }],
  ]) {
    const client = {
      get: async (p) => ({
        data: p.endsWith("/commits") ? [] : fixtureMetadata(),
      }),
      paginate: async (p) => ({
        items: p.endsWith("/releases") ? releases : [],
        complete: !p.endsWith("/releases"),
      }),
    };
    const next = await collectTool({
      registration: { id: "1", target: fixtureTarget() },
      previous,
      client,
      now: NOW,
    });
    assert.equal(next.release.value.tag, "v1");
    assert.equal(next.release.succeededAt, "2026-10-21T00:00:00Z");
    assert.equal(next.release.status, "partial");
  }
});
test("review: registration mode never polls200 candidates or regenerates the weekly report", async () => {
  const previous = previousData();
  previous.candidates = Array.from({ length: 200 }, (_, i) => candidate(i + 1));
  let candidateRequests = 0,
    searchRequests = 0;
  const client = {
    get: async () => {
      candidateRequests++;
      return { data: fixtureMetadata() };
    },
    paginate: async (p) => {
      if (p.startsWith("/search")) searchRequests++;
      return { items: [], complete: true };
    },
  };
  const next = await collectAll({
    config: fixtureConfig(),
    previous,
    client,
    now: NOW,
    mode: "registration",
  });
  assert.equal(candidateRequests, 0);
  assert.equal(searchRequests, 0);
  assert.deepEqual(next.current.weekly, previous.current.weekly);
  assert.deepEqual(next.history, previous.history);
});
