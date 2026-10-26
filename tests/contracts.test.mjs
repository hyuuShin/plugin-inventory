import test from "node:test";
import assert from "node:assert/strict";
import {
  validateConfig,
  validateSiteData,
  createEmptyStored,
} from "../shared/contracts.mjs";
const config = {
  owner: "hyuuShin",
  repository: "plugin-inventory",
  basePath: "/plugin-inventory/",
  timeZone: "Asia/Seoul",
  categories: ["개발"],
  limits: { registrations: 100, candidates: 200 },
  discoveryQueries: [],
};
test("empty application has no fabricated tools or observations", () => {
  const s = createEmptyStored(config, "2026-10-26T00:00:00Z");
  assert.equal(validateSiteData(s.current).schemaVersion, 1);
  assert.deepEqual(s.current.registrations, []);
  assert.deepEqual(s.history, []);
  assert.equal(s.current.run.lastSuccessfulAt, null);
});
test("config and data reject unsupported owner, paths and schema", () => {
  assert.throws(() => validateConfig({ ...config, owner: "bad/owner" }));
  assert.throws(() =>
    validateConfig({ ...config, basePath: "https://other/" }),
  );
  assert.throws(() => validateSiteData({ schemaVersion: 99 }));
  assert.equal(validateConfig(config).owner, "hyuuShin");
});
