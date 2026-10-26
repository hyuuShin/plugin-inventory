import test from "node:test";
import assert from "node:assert/strict";
import {
  refreshCandidatePool,
  buildWeeklyReport,
} from "../collector/discovery.mjs";
import { fixtureConfig, NOW } from "./helpers/fixtures.mjs";
const c = (id, extra = {}) => ({
  repositoryId: id,
  fullName: "owner/tool-" + id,
  url: "https://github.com/owner/tool-" + id,
  description: "Original description",
  topics: [],
  stars: 125,
  pushedAt: "2026-10-25T00:00:00Z",
  archived: false,
  fork: false,
  discoveredAt: NOW,
  lastSuccessfulAt: NOW,
  ...extra,
});
const observations = (id, old = 100, current = 125) => [
  {
    repositoryId: id,
    scopePath: "",
    observedAt: "2026-10-19T00:00:00Z",
    stars: old,
    valid: { stars: true },
  },
  {
    repositoryId: id,
    scopePath: "",
    observedAt: NOW,
    stars: current,
    valid: { stars: true },
  },
];
test("pool deduplicates topics and excludes forks archived and all tracked repo scopes", () => {
  const pool = refreshCandidatePool({
    previous: [],
    searchResults: [
      c(1),
      c(1),
      c(2),
      c(3, { fork: true }),
      c(4, { archived: true }),
    ],
    trackedRepositoryIds: [2],
    config: fixtureConfig(),
    now: NOW,
    reportDue: false,
  });
  assert.deepEqual(
    pool.map((x) => x.repositoryId),
    [1],
  );
});
test("missing search results preserve pending baseline candidates under the hard cap", () => {
  const pool = refreshCandidatePool({
    previous: [c(1)],
    searchResults: [c(2, { stars: 999 })],
    trackedRepositoryIds: [],
    config: fixtureConfig({ limits: { candidates: 1 } }),
    now: NOW,
    reportDue: false,
  });
  assert.equal(pool[0].repositoryId, 1);
  assert.equal(
    refreshCandidatePool({
      previous: [c(1)],
      searchResults: [c(2)],
      trackedRepositoryIds: [],
      config: fixtureConfig(),
      now: NOW,
      reportDue: false,
    }).length,
    2,
  );
});
test("first report contains only bounded newcomers, without invented delta", () => {
  const report = buildWeeklyReport({
    candidates: Array.from({ length: 8 }, (_, i) => c(i + 1)),
    observations: [],
    now: NOW,
    coverage: { searchComplete: true },
  });
  assert.equal(report.growth.length, 0);
  assert.equal(report.newcomers.length, 5);
  assert.equal(report.newcomers[0].delta, null);
  assert.equal(report.weekId, "2026-10-26");
});
test("positive measured growth ranks deterministically and loss never rises", () => {
  const candidates = [
    c(1),
    c(2, { pushedAt: "2026-10-26T00:00:00Z" }),
    c(3, { stars: 80 }),
  ];
  const report = buildWeeklyReport({
    candidates,
    observations: [
      ...observations(1),
      ...observations(2),
      ...observations(3, 100, 80),
    ],
    now: NOW,
    coverage: { searchComplete: false },
  });
  assert.deepEqual(
    report.growth.map((x) => x.repositoryId),
    [2, 1],
  );
  assert.equal(report.growth[0].delta, 25);
  assert.equal(report.growth[0].baselineAt, "2026-10-19T00:00:00Z");
  assert.equal(report.status, "partial");
  assert.equal(report.newcomers.length, 0);
});
