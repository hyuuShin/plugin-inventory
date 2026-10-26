import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeObservations,
  findWeeklyBaseline,
  retainWeeks,
} from "../collector/history.mjs";
import { NOW } from "./helpers/fixtures.mjs";
const obs = (date, stars, extra = {}) => ({
  repositoryId: 1,
  scopePath: "",
  observedAt: date,
  stars,
  releaseId: null,
  commitSha: null,
  valid: { stars: true, release: true, activity: true },
  ...extra,
});
test("daily replacement keeps successful values when a later attempt fails", () => {
  const old = obs("2026-10-26T00:00:00Z", 125);
  const rows = mergeObservations(
    [old],
    [
      obs(NOW, null, {
        valid: { stars: false, release: false, activity: false },
      }),
    ],
    { now: NOW, days: 90 },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stars, 125);
  assert.equal(rows[0].observedAt, old.observedAt);
});
test("weekly baseline uses repository identity and actual valid dates, never substitutes zero", () => {
  const rows = [
    obs("2026-10-19T00:00:00Z", 100),
    obs(NOW, 125),
    obs(NOW, 999, { scopePath: "skill" }),
  ];
  const b = findWeeklyBaseline(rows, { repositoryId: 1, now: NOW });
  assert.equal(b.current.stars - b.baseline.stars, 25);
  assert.equal(b.baseline.observedAt, "2026-10-19T00:00:00Z");
  assert.equal(
    findWeeklyBaseline([obs(NOW, 125)], { repositoryId: 1, now: NOW }),
    null,
  );
  assert.equal(
    findWeeklyBaseline([obs("2026-10-10T00:00:00Z", 50), obs(NOW, 125)], {
      repositoryId: 1,
      now: NOW,
    }),
    null,
  );
});
test("retention cuts off expired observations and retains distinct scope identities", () => {
  const rows = mergeObservations(
    [obs("2025-01-01T00:00:00Z", 1), obs(NOW, 5, { scopePath: "old" })],
    [obs(NOW, 6, { scopePath: "new" })],
    { now: NOW, days: 90 },
  );
  assert.deepEqual(rows.map((r) => r.scopePath).sort(), ["new", "old"]);
  assert.equal(
    retainWeeks(
      Array.from({ length: 60 }, (_, i) => ({
        weekId: String(i).padStart(2, "0"),
      })),
      { count: 52 },
    ).length,
    52,
  );
});
test("star loss stays negative and failed sample never becomes a baseline", () => {
  const rows = [obs("2026-10-19T00:00:00Z", 100), obs(NOW, 80)];
  const b = findWeeklyBaseline(rows, { repositoryId: 1, now: NOW });
  assert.equal(b.current.stars - b.baseline.stars, -20);
  rows[0].valid.stars = false;
  assert.equal(findWeeklyBaseline(rows, { repositoryId: 1, now: NOW }), null);
});
