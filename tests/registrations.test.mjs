import test from "node:test";
import assert from "node:assert/strict";
import {
  syncRegistrations,
  parseRegistrationIssue,
} from "../collector/registrations.mjs";
import {
  fixtureIssue,
  fixtureConfig,
  fixtureTarget,
} from "./helpers/fixtures.mjs";
const config = fixtureConfig(),
  resolve = async () => fixtureTarget();
test("only owner open labeled issues are considered, not PRs or external input", async () => {
  const rows = await syncRegistrations({
    config,
    resolve,
    issues: [
      fixtureIssue(),
      fixtureIssue({ number: 2, user: { login: "other" } }),
      fixtureIssue({ number: 3, pull_request: {} }),
      fixtureIssue({ number: 4, state: "closed" }),
      fixtureIssue({ number: 5, labels: [] }),
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "1");
});
test("edits are authoritative and close/reopen removes/restores the record", async () => {
  const i = fixtureIssue();
  i.body = i.body.replace("작업에 사용합니다.", "<script>$(secret)</script>");
  assert.equal(
    parseRegistrationIssue(i, config).draft.memo,
    "<script>$(secret)</script>",
  );
  assert.deepEqual(
    await syncRegistrations({
      issues: [{ ...i, state: "closed" }],
      config,
      resolve,
    }),
    [],
  );
  assert.equal(
    (await syncRegistrations({ issues: [i], config, resolve }))[0].memo,
    "<script>$(secret)</script>",
  );
});
test("duplicates use lowest open Issue while distinct paths remain independent", async () => {
  const rows = await syncRegistrations({
    issues: [
      fixtureIssue({ number: 4 }),
      fixtureIssue({ number: 2 }),
      fixtureIssue({
        number: 3,
        body: fixtureIssue().body.replace(
          "example/tool",
          "example/tool/tree/main/skills",
        ),
      }),
    ],
    config,
    resolve: async (url) =>
      fixtureTarget({ scopePath: url.includes("/tree/") ? "skills" : "" }),
  });
  assert.equal(rows.find((r) => r.id === "2").validation.status, "valid");
  assert.equal(rows.find((r) => r.id === "4").validation.status, "duplicate");
  assert.equal(rows.find((r) => r.id === "3").validation.status, "valid");
});
test("malformed and over-limit records remain actionable without stopping good ones", async () => {
  const issues = [
    fixtureIssue(),
    fixtureIssue({ number: 2, body: "bad input" }),
    fixtureIssue({ number: 3 }),
  ];
  const rows = await syncRegistrations({
    issues,
    config: { ...config, limits: { registrations: 2 } },
    resolve,
  });
  assert.deepEqual(
    rows.map((r) => r.validation.status),
    ["valid", "invalid", "over-limit"],
  );
  assert.equal(rows[1].target, null);
});
