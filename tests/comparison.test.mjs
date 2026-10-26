import test from "node:test";
import assert from "node:assert/strict";
import * as signals from "../web/signals.mjs";
test("review: comparison separates first scan, new evidence and failed fields", () => {
  const tool = {
    changes: {
      baselineAvailable: false,
      releaseChanged: false,
      commitChanged: false,
    },
    release: { status: "ok", value: {} },
    activity: { status: "ok", value: {} },
  };
  assert.equal(signals.comparisonState(tool).baseline, "first");
  tool.changes = {
    baselineAvailable: true,
    releaseBaselineAvailable: true,
    commitBaselineAvailable: true,
    releaseChanged: true,
    commitChanged: true,
  };
  assert.deepEqual(signals.comparisonState(tool), {
    baseline: "available",
    release: "changed",
    activity: "changed",
  });
  tool.release.status = "partial";
  tool.activity.status = "error";
  assert.equal(signals.comparisonState(tool).release, "unknown");
  assert.equal(signals.comparisonState(tool).activity, "unknown");
});
