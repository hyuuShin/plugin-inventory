import test from "node:test";
import assert from "node:assert/strict";
import {
  issueFormUrl,
  issueUrl,
  workflowUrl,
  safeGitHubUrl,
} from "../web/links.mjs";
import { fixtureConfig } from "./helpers/fixtures.mjs";
test("Issue form preserves source URL and Korean memo with exact field IDs", () => {
  const url = new URL(
    issueFormUrl({
      config: fixtureConfig(),
      targetUrl: "https://github.com/a/b/tree/main/skills/한글",
      name: "관심 도구",
      kind: "MCP",
      category: "문서",
      memo: "사용 방법",
    }),
  );
  assert.equal(url.hostname, "github.com");
  assert.equal(url.searchParams.get("template"), "track-tool.yml");
  assert.equal(url.searchParams.get("usage-memo"), "사용 방법");
  assert.equal(url.searchParams.get("kind"), "MCP");
  assert.match(url.searchParams.get("github-url"), /skills/);
  assert.equal(url.pathname, "/hyuuShin/plugin-inventory/issues/new");
});
test("links enforce configured account without accepting unsafe schemes or hosts", () => {
  assert.equal(
    issueUrl(fixtureConfig(), 2),
    "https://github.com/hyuuShin/plugin-inventory/issues/2",
  );
  assert.match(workflowUrl(fixtureConfig()), /update-and-deploy.yml$/);
  for (const u of [
    "javascript:alert(1)",
    "https://other.test/",
    "https://name@github.com/a/b",
    "https://github.com:444/a/b",
  ])
    assert.equal(safeGitHubUrl(u), null);
});
test("long optional memo is omitted while source prefill survives", () => {
  const url = issueFormUrl({
    config: fixtureConfig(),
    targetUrl: "https://github.com/a/b",
    memo: "가".repeat(4000),
  });
  assert.ok(url.length < 7500);
  assert.equal(new URL(url).searchParams.get("usage-memo"), null);
  assert.equal(
    new URL(url).searchParams.get("github-url"),
    "https://github.com/a/b",
  );
});
